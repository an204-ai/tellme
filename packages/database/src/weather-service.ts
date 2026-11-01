import { z } from "zod";

export const WEATHER_FRESH_MS = 15 * 60 * 1000;
const MAX_STALE_MS = 60 * 60 * 1000;
const condition = z.object({ id: z.number().int(), description: z.string(), icon: z.string().regex(/^\d{2}[dn]$/) });
const observation = z.object({
  dt: z.number(), main: z.object({ temp: z.number(), feels_like: z.number(), humidity: z.number() }),
  weather: z.array(condition).min(1), wind: z.object({ speed: z.number() }),
  rain: z.object({ "1h": z.number().optional(), "3h": z.number().optional() }).optional(),
});
const currentSchema = observation.extend({ name: z.string(), timezone: z.number() });
const forecastSchema = z.object({ list: z.array(observation.extend({ pop: z.number().min(0).max(1).optional() })) });
export type WeatherReport = {
  place: string; observedAt: number; fetchedAt: number; timezone: number;
  temperature: number; feelsLike: number; humidity: number; windKph: number;
  conditionId: number; description: string; icon: string; rainMm: number;
  forecast: { at: number; temperature: number; conditionId: number; icon: string; rainChance: number | null }[];
  forecastAvailable: boolean; stale: boolean;
};
export class WeatherUnavailable extends Error {
  constructor(public reason: "configuration" | "quota" | "upstream") { super("Weather unavailable"); }
}
export type WeatherCache = {
  get: (key: string) => Promise<WeatherReport | null>;
  set: (key: string, value: WeatherReport) => Promise<void>;
  reserve: (calls: number) => Promise<boolean>;
};

/** Shared 1 km cells, in-flight coalescing and no dependency on MongoDB. */
export function createWeatherService(options: { apiKey: string; cache: WeatherCache; fetcher?: typeof fetch; now?: () => number }) {
  const pending = new Map<string, Promise<WeatherReport>>();
  const fetcher = options.fetcher || fetch, now = options.now || Date.now;
  const upstream = async (endpoint: "weather" | "forecast", lat: number, lon: number) => {
    const url = new URL(`https://api.openweathermap.org/data/2.5/${endpoint}`);
    url.search = new URLSearchParams({ lat: lat.toFixed(2), lon: lon.toFixed(2), appid: options.apiKey, units: "metric", lang: "vi", ...(endpoint === "forecast" ? { cnt: "8" } : {}) }).toString();
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new WeatherUnavailable(response.status === 429 ? "quota" : "upstream");
      return await response.json();
    } catch (error) {
      // Never forward fetch errors/URLs, which may contain the API key.
      throw error instanceof WeatherUnavailable ? error : new WeatherUnavailable("upstream");
    }
  };
  const get = async (lat: number, lon: number): Promise<WeatherReport> => {
    if (!options.apiKey) throw new WeatherUnavailable("configuration");
    lat = Number(lat.toFixed(2)); lon = Number(lon.toFixed(2));
    const key = `${lat.toFixed(2)}:${lon.toFixed(2)}`;
    let cached: WeatherReport | null = null;
    try { cached = await options.cache.get(key); } catch { /* Cache failure must not expose internals. */ }
    if (cached && now() - cached.fetchedAt < WEATHER_FRESH_MS) return { ...cached, stale: false };
    const existing = pending.get(key);
    if (existing) return existing;
    const task = (async () => {
      try {
        if (!await options.cache.reserve(2)) throw new WeatherUnavailable("quota");
        const [rawCurrent, rawForecast] = await Promise.all([
          upstream("weather", lat, lon),
          upstream("forecast", lat, lon).catch(() => null),
        ]);
        const current = currentSchema.safeParse(rawCurrent), prediction = forecastSchema.safeParse(rawForecast);
        if (!current.success) throw new WeatherUnavailable("upstream");
        const value = current.data, condition = value.weather[0]!;
        const report: WeatherReport = {
          place: value.name || "Khu vực của bạn", observedAt: value.dt * 1000, fetchedAt: now(), timezone: value.timezone,
          temperature: Math.round(value.main.temp), feelsLike: Math.round(value.main.feels_like), humidity: value.main.humidity,
          windKph: Math.round(value.wind.speed * 3.6), conditionId: condition.id, description: condition.description, icon: condition.icon,
          rainMm: value.rain?.["1h"] || 0,
          forecast: prediction.success ? prediction.data.list.filter((item) => item.dt * 1000 > now()).map((item) => ({ at: item.dt * 1000, temperature: Math.round(item.main.temp), conditionId: item.weather[0]!.id, icon: item.weather[0]!.icon, rainChance: item.pop ?? null })) : [],
          forecastAvailable: prediction.success, stale: false,
        };
        await options.cache.set(key, report).catch(() => {});
        return report;
      } catch (error) {
        if (cached && now() - cached.fetchedAt < MAX_STALE_MS) return { ...cached, stale: true };
        throw error instanceof WeatherUnavailable ? error : new WeatherUnavailable("upstream");
      } finally { pending.delete(key); }
    })();
    pending.set(key, task);
    return task;
  };
  return { get };
}
