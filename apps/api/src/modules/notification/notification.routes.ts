import { listSystemNotices, readSystemNotices, redis, registerSystemRecipient, stopWeatherWatch, watchWeather } from "@tellme/database";
import { fail } from "../../backend/security.js";
import { Hono } from "hono";
import { z } from "zod";
import { notices } from "../../backend/database.js";
import { type Env } from "../../backend/security.js";
import * as v from "../../backend/validation.js";
export function registerNotificationRoutes(api: Hono<Env>) {
  api.get("/notifications/system", async (c) => { c.header("Cache-Control", "private, no-store"); return c.json(await listSystemNotices(c.get("user")._id)); });
  api.put("/weather/watch", async (c) => {
    const { lat, lon } = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).parse(await c.req.json());
    if (redis.status !== "ready") fail(503, "Thông báo thời tiết đang gián đoạn. Bạn thử lại sau nha.");
    const me = c.get("user");
    if (me.settings.notifySystem === false) return c.json({ enabled: false });
    await registerSystemRecipient(me._id, true);
    await watchWeather(me._id, lat, lon);
    return c.json({ enabled: true });
  });
  api.delete("/weather/watch", async (c) => { await stopWeatherWatch(c.get("user")._id); return c.json({ ok: true }); });
  api.put("/notifications/read", async (c) => {
    const { ids } = z
      .object({ ids: z.array(v.idSchema).max(100) })
      .parse(await c.req.json());
    await notices.updateMany(
      { recipientId: c.get("user")._id, _id: { $in: ids } },
      { $set: { read: true } },
    );
    await readSystemNotices(c.get("user")._id, ids);
    return c.json({ ok: true });
  });
}
