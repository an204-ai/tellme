import { Hono } from "hono";
import { MediaService } from "./media.service";

export const mediaRouter = new Hono();

mediaRouter.get("/", async (c) => {
  return c.json({ message: "media module ready" });
});
