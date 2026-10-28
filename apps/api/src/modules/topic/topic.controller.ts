import { Hono } from "hono";
import { TopicService } from "./topic.service";

export const topicRouter = new Hono();

topicRouter.get("/", async (c) => {
  return c.json({ message: "topic module ready" });
});
