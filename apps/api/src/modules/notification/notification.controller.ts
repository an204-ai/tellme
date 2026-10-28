import { Hono } from "hono";
import { NotificationService } from "./notification.service";

export const notificationRouter = new Hono();

notificationRouter.get("/", async (c) => {
  return c.json({ message: "notification module ready" });
});
