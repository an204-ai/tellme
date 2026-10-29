import { HTTPException } from "hono/http-exception";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { users } from "../../backend/database.js";
import {
  authenticate,
  rateLimit,
  hashPassword,
  verifyPassword,
  createSession,
  removeSession,
  type Env,
} from "../../backend/security.js";
import { defaults, type User } from "../../backend/models.js";
import { now, personDTO } from "../../backend/domain.js";
import * as v from "../../backend/validation.js";
export const authRouter = new Hono<Env>();
authRouter.use("*", rateLimit(60, 60000));
authRouter.post("/register", async (c) => {
  const input = v.registerSchema.parse(await c.req.json());
  const id = randomUUID();
  const base =
    input.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18) || "tellme";
  const user: User = {
    _id: id,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    username: `${base}${id.slice(0, 6)}`,
    name: input.name,
    avatar: "/images/avatar-default.svg",
    cover: "/images/cover-default.svg",
    bio: "",
    location: "",
    following: [],
    blocked: [],
    hiddenPosts: [],
    settings: { ...defaults },
    createdAt: now(),
  };
  await users.insertOne(user);
  await createSession(c, id);
  return c.json({ person: personDTO(user, user) }, 201);
});
authRouter.post("/login", async (c) => {
  const input = v.loginSchema.parse(await c.req.json());
  const user = await users.findOne({ email: input.email });
  // A dummy hash keeps the password derivation cost similar for unknown emails.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash || "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || !valid)
    throw new HTTPException(401, { message: "Email hoặc mật khẩu chưa đúng." });
  await removeSession(c);
  await createSession(c, user._id);
  return c.json({ person: personDTO(user, user) });
});
authRouter.post("/logout", async (c) => {
  await removeSession(c);
  return c.json({ ok: true });
});
authRouter.get("/me", authenticate, (c) =>
  c.json({ person: personDTO(c.get("user"), c.get("user")) }),
);
