import { Hono } from "hono";
import { ConnectionService } from "./connection.service";

export const connectionRouter = new Hono();

connectionRouter.get("/", async (c) => {
  return c.json({ message: "connection module ready" });
});
