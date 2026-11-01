import { config } from "./config.js";
import { redis, prefix } from "./queue.js";
import { createWeatherService, type WeatherReport } from "./weather-service.js";

const memory = new Map<string, WeatherReport>();
let minute = "", used = 0, month = "", monthly = 0;
export const weather = createWeatherService({ apiKey: config.OPENWEATHER_API_KEY, cache: {
  async get(key) {
    const local = memory.get(key);
    if (local && Date.now() - local.fetchedAt < 15 * 60 * 1000) return local;
    if (redis.status === "ready") {
      try { const value = await redis.get(`${prefix}:weather:data:${key}`); if (value) return JSON.parse(value) as WeatherReport; } catch { /* Fall back to bounded local cache. */ }
    }
    return local || null;
  },
  async set(key, value) {
    memory.delete(key); memory.set(key, value);
    if (memory.size > 256) memory.delete(memory.keys().next().value!);
    if (redis.status === "ready") await redis.set(`${prefix}:weather:data:${key}`, JSON.stringify(value), "EX", 3600);
  },
  async reserve(calls) {
    const now = new Date(), nextMinute = String(Math.floor(now.getTime() / 60000)), nextMonth = now.toISOString().slice(0, 7);
    if (redis.status === "ready") {
      try {
        const count = await redis.eval("local a=redis.call('INCRBY',KEYS[1],ARGV[1]); redis.call('EXPIRE',KEYS[1],120); local b=redis.call('INCRBY',KEYS[2],ARGV[1]); redis.call('EXPIRE',KEYS[2],2764800); if a>50 or b>900000 then return 0 else return 1 end", 2, `${prefix}:weather:minute:${nextMinute}`, `${prefix}:weather:month:${nextMonth}`, calls);
        return count === 1;
      } catch { return false; } // An uncertain shared budget must not consume the provider quota.
    }
    if (config.NODE_ENV === "production") return false;
    if (minute !== nextMinute) { minute = nextMinute; used = 0; }
    if (month !== nextMonth) { month = nextMonth; monthly = 0; }
    used += calls; monthly += calls;
    return used <= 50 && monthly <= 900000;
  },
} });

