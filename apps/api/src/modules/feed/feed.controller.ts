import { Hono } from "hono";
import { FeedService } from "./feed.service";

export const feedRouter = new Hono();

feedRouter.get("/", async (c) => {
  return c.json({ message: "feed module ready" });
});
