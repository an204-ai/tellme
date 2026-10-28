import { Hono } from "hono";
import { UserService } from "./user.service";

export const userRouter = new Hono();

userRouter.get("/", async (c) => {
  return c.json({ message: "user module ready" });
});
