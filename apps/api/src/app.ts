import { Hono } from "hono";
import { errorHandler } from "./common/middleware/error-handler.middleware";
import { authRouter } from "./modules/auth/auth.controller";
import { userRouter } from "./modules/user/user.controller";
import { postRouter } from "./modules/post/post.controller";
import { storyRouter } from "./modules/story/story.controller";
import { feedRouter } from "./modules/feed/feed.controller";
import { exploreRouter } from "./modules/explore/explore.controller";
import { messageRouter } from "./modules/message/message.controller";
import { connectionRouter } from "./modules/connection/connection.controller";
import { notificationRouter } from "./modules/notification/notification.controller";
import { mediaRouter } from "./modules/media/media.controller";
import { moderationRouter } from "./modules/moderation/moderation.controller";

export const app = new Hono();

app.onError(errorHandler);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

const api = app.basePath("/api");
api.route("/auth", authRouter);
api.route("/users", userRouter);
api.route("/posts", postRouter);
api.route("/stories", storyRouter);
api.route("/feed", feedRouter);
api.route("/explore", exploreRouter);
api.route("/messages", messageRouter);
api.route("/connections", connectionRouter);
api.route("/notifications", notificationRouter);
api.route("/media", mediaRouter);
api.route("/moderation", moderationRouter);
