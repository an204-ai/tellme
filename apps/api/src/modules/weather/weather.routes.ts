import { Hono } from "hono";
import { z } from "zod";
import { config, weather } from "@tellme/database";
import { rateLimit, type Env } from "../../backend/security.js";
import { WeatherUnavailable } from "./weather.service.js";


export function registerWeatherRoutes(app: Hono<Env>) {
  app.get("/api/weather/config", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ enabled: !!config.OPENWEATHER_API_KEY });
  });
  app.get("/api/weather", rateLimit(240, 60000, "weather"), async (c) => {
    const { lat, lon } = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) }).parse(c.req.query());
    c.header("Cache-Control", "private, no-store");
    try { return c.json(await weather.get(lat, lon)); }
    catch (error) {
      if (!(error instanceof WeatherUnavailable)) throw error;
      const message = error.reason === "configuration" ? "Thời tiết chưa được kết nối." : error.reason === "quota" ? "Thời tiết đang nghỉ một chút. Bạn xem lại sau nhé." : "Chưa lấy được thời tiết. Thử lại sau nhé.";
      return c.json({ error: message }, 503);
    }
  });
}
