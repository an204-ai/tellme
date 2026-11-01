"use client";
import { useId } from "react";
import { CloudFog, Snowflake, Wind } from "lucide-react";

/** Weather symbol geometry follows the original Uiverse sun / cloud / rain. */
export function WeatherSymbol({ conditionId = 802, night = false }: { conditionId?: number; night?: boolean }) {
  const id = useId().replaceAll(":", "");
  if (conditionId >= 600 && conditionId < 700) return <Snowflake className="weather-symbol" aria-hidden="true" strokeWidth={1.5} />;
  if (conditionId >= 700 && conditionId < 800) {
    const Icon = conditionId === 781 ? Wind : CloudFog;
    return <Icon className="weather-symbol" aria-hidden="true" strokeWidth={1.5} />;
  }
  const rain = conditionId >= 200 && conditionId < 600, cloud = rain || conditionId > 800;
  return <svg className="weather-symbol" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-sun`} x1="16.5" y1="19.67" x2="21.5" y2="28.33" gradientUnits="userSpaceOnUse"><stop stopColor="#fbbf24" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
      <linearGradient id={`${id}-cloud`} x1="22.56" y1="21.96" x2="39.2" y2="50.8" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset=".45" stopColor="#f3f7fe" /><stop offset="1" stopColor="#c5d9f4" /></linearGradient>
      <linearGradient id={`${id}-rain`}><stop stopColor="#b9dcff" /><stop offset="1" stopColor="#60a5fa" /></linearGradient>
    </defs>
    <g transform={cloud ? undefined : "translate(-2 -13) scale(1.8)"}>
      {night ? <path d="M24 14a11 11 0 1 0 0 22c-8-4-8-18 0-22Z" fill="#fff0b5" /> : <>
        <circle cx="19" cy="24" r="5" stroke="#f8af18" strokeWidth=".5" fill={`url(#${id}-sun)`} />
        <path className="weather-symbol-rays" d="M19 15.67V12.5m0 23v-3.17m5.89-14.22l2.24-2.24M10.87 32.13l2.24-2.24m0-11.78l-2.24-2.24m16.26 16.26l-2.24-2.24M7.5 24h3.17m19.83 0h-3.17" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>}
    </g>
    {cloud && <path d="M46.5 31.5h-.32a10.49 10.49 0 00-19.11-8 7 7 0 00-10.57 6 7.21 7.21 0 00.1 1.14A7.5 7.5 0 0018 45.5a4.19 4.19 0 00.5 0v0h28a7 7 0 000-14z" fill={`url(#${id}-cloud)`} stroke="#a7c1e2" strokeWidth=".6" />}
    {rain && <g className="weather-symbol-rain" stroke={`url(#${id}-rain)`} strokeWidth="2" strokeLinecap="round">{[24.39, 31.39, 38.39].map((x) => <path key={x} d={`M${x} 43.03l-.78 4.94`} />)}</g>}
    {conditionId >= 200 && conditionId < 300 && <path d="m34 34-6 11h6l-3 10 12-15h-8l4-6z" fill="#fbbf24" />}
  </svg>;
}
