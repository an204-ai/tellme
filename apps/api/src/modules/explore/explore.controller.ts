import { Hono } from "hono";
import { ExploreService } from "./explore.service";

export const exploreRouter = new Hono();

exploreRouter.get("/", async (c) => {
  return c.json({ message: "explore module ready" });
});
