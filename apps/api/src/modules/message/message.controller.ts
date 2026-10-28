import { Hono } from "hono";
import { MessageService } from "./message.service";

export const messageRouter = new Hono();

messageRouter.get("/", async (c) => {
  return c.json({ message: "message module ready" });
});
