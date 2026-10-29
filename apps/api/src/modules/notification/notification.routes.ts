import { Hono } from "hono";
import { z } from "zod";
import { notices } from "../../backend/database.js";
import { type Env } from "../../backend/security.js";
import * as v from "../../backend/validation.js";
export function registerNotificationRoutes(api: Hono<Env>) {
  api.put("/notifications/read", async (c) => {
    const { ids } = z
      .object({ ids: z.array(v.idSchema).max(100) })
      .parse(await c.req.json());
    await notices.updateMany(
      { recipientId: c.get("user")._id, _id: { $in: ids } },
      { $set: { read: true } },
    );
    return c.json({ ok: true });
  });
}
