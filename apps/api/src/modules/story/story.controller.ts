import { Hono } from "hono";
import { StoryService } from "./story.service";

export const storyRouter = new Hono();

storyRouter.get("/", async (c) => {
  return c.json({ message: "story module ready" });
});
