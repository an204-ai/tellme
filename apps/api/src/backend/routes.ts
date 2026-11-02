import { authRouter } from "../modules/auth/auth.routes.js";
import { registerSearchRoutes } from "../modules/search/search.routes.js";
import { registerBootstrapRoutes } from "../modules/bootstrap/bootstrap.routes.js";
import { registerUserRoutes } from "../modules/user/user.routes.js";
import { registerPostRoutes } from "../modules/post/post.routes.js";
import { registerStoryRoutes } from "../modules/story/story.routes.js";
import { registerMessageRoutes } from "../modules/message/message.routes.js";
import { registerNotificationRoutes } from "../modules/notification/notification.routes.js";
import { registerMediaRoutes } from "../modules/media/media.routes.js";
import { Hono } from "hono";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import { MongoServerError } from "mongodb";
import { config } from "./config.js";
import { mongo } from "./database.js";
import { optionalAuthenticate, checkOrigin, rateLimit, type Env } from "./security.js";
import { HTTPException as AuthError } from "hono/http-exception";
import { MediaUnavailable, isTransientConnectionError, connectionFailure, databaseUnavailable, logEvent } from "@tellme/database";
import { registerRealtimeRoutes } from "./realtime.js";
import { registerAdminRoutes } from "../modules/admin/admin.routes.js";
import { registerArchiveRoutes } from "../modules/archive/archive.routes.js";
import { registerMusicRoutes } from "../modules/music/music.routes.js";
import { registerWeatherRoutes } from "../modules/weather/weather.routes.js";
import { observeRequest } from "./observability.js";
const cloudUrl = new URL(config.CLOUDINARY_URL);
cloudinary.config({
  cloud_name: cloudUrl.hostname,
  api_key: decodeURIComponent(cloudUrl.username),
  api_secret: decodeURIComponent(cloudUrl.password),
  secure: true,
});
export const app = new Hono<Env>();
app.use("*", secureHeaders());
app.use("*", observeRequest);
const standardBodyLimit = bodyLimit({
  maxSize: 3 * 1024 * 1024,
  onError: (c) =>
    c.json({ error: "Dữ liệu gửi lên vượt quá kích thước cho phép." }, 413),
});
const imageUploadBodyLimit = bodyLimit({
  // Leave room for multipart boundaries and file metadata around a 50 MiB image.
  maxSize: 51 * 1024 * 1024,
  onError: (c) => c.json({ error: "Ảnh tối đa 50 MB." }, 413),
});
app.use("*", async (c, next) => {
  const middleware =
    c.req.method === "POST" && c.req.path === "/api/media/upload"
      ? imageUploadBodyLimit
      : standardBodyLimit;
  await middleware(c, next);
});
app.use("*", checkOrigin);
let lastDatabaseFailureLog = -Infinity;
app.onError((error, c) => {
  if (isTransientConnectionError(error)) {
    if (Date.now() - lastDatabaseFailureLog >= 30000) {
      console.error("MongoDB connection unavailable; the driver will retry.", connectionFailure(error));
      logEvent({ level: "error", service: "api", event: "database.unavailable", code: connectionFailure(error).codes.join(",") });
      lastDatabaseFailureLog = Date.now();
    }
    return databaseUnavailable();
  }
  if (error instanceof MediaUnavailable) return c.json({ error: error.message }, 400);
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return c.json(
      { error: error.issues[0]?.message || "Thông tin không hợp lệ." },
      400,
    );
  if (error instanceof SyntaxError)
    return c.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, 400);
  if (error instanceof MongoServerError && error.code === 11000)
    return c.json(
      { error: "Email, tên người dùng hoặc nội dung này đã tồn tại." },
      409,
    );
  // Never log driver errors: they may contain connection strings or uploaded URLs.
  console.error("API request failed", {
    type: error.name,
    path: c.req.routePath,
  });
  logEvent({ service: "api", level: "error", event: "request.failed", code: error.name, route: c.req.routePath || "/unmatched", requestId: c.get("requestId") });
  return c.json({ error: "Chưa xử lý được yêu cầu. Bạn thử lại nhé." }, 503);
});
app.get("/health", async (c) => {
  await mongo.db(config.MONGODB_DB).command({ ping: 1 });
  return c.json({ status: "ok" });
});

app.route("/api/auth", authRouter);
registerWeatherRoutes(app);
const api = new Hono<Env>();
api.use("*", optionalAuthenticate, rateLimit(300, 60000));
api.use("*", async (c, next) => {
  const publicRead = c.req.method === "GET" && (/^\/api\/(bootstrap|search|posts(?:\/[^/]+)?|stories(?:\/[^/]+)?|users\/[^/]+(?:\/(?:activity|journey|followers|following))?)$/.test(c.req.path) || /^\/api\/stories\/[^/]+\/music\/stream$/.test(c.req.path));
  if (c.get("user")._id === "guest" && (!publicRead || c.req.path === "/api/stories/saved" || c.req.query("view") === "saved" || c.req.query("tab") === "following"))
    throw new AuthError(401, { message: "Đăng nhập để sử dụng chức năng này." });
  const user = c.get("user");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && user.emailVerificationRequired && !user.emailVerifiedAt)
    throw new AuthError(403, { message: "Xác thực email trong Cài đặt tài khoản trước khi chia sẻ hoặc tương tác nhé." });
  await next();
});
registerBootstrapRoutes(api);
registerSearchRoutes(api);
registerUserRoutes(api);
registerPostRoutes(api);
registerStoryRoutes(api);
registerMusicRoutes(api);
registerMessageRoutes(api);
registerNotificationRoutes(api);
registerMediaRoutes(api);
registerRealtimeRoutes(api);
registerAdminRoutes(api);
registerArchiveRoutes(api);
app.route("/api", api);
app.notFound((c) => c.json({ error: "Đường dẫn không tồn tại." }, 404));
