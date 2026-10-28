import { Hono } from "hono";
import { PostService } from "./post.service";

export const postRouter = new Hono();

postRouter.get("/", async (c) => {
  return c.json({ message: "post module ready" });
});
