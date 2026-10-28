import { Hono } from "hono";
import { AuthService } from "./auth.service";

export const authRouter = new Hono();

authRouter.get("/", async (c) => {
  return c.json({ message: "auth module ready" });
});
