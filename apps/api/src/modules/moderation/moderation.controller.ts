import { Hono } from "hono";
import { ModerationService } from "./moderation.service";

export const moderationRouter = new Hono();

moderationRouter.get("/", async (c) => {
  return c.json({ message: "moderation module ready" });
});
