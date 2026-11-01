import { createHash } from "node:crypto";
import type { WeatherReport } from "./weather-service.js";

export type SystemIcon = "sunrise" | "lunch" | "sunset" | "moon" | "weather";
export type SystemNotice = { id: string; userId: "system"; kind: "system"; title: string; text: string; systemIcon: SystemIcon; url: string; read: boolean; at: string };
export const SYSTEM_TTL = 3 * 86400;
export const SYSTEM_INBOX_LIMIT = 20;
export function systemNoticeId(userId: string, event: string) {
  const h = createHash("sha256").update(`${userId}:${event}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const slots = [
  { minute: 510, icon: "sunrise", title: "Chào ngày mới", text: "Chúc bạn một ca làm dễ thở. Có góc bàn xinh hay ly cà phê ngon, kể Tellme nghe nha." },
  { minute: 720, icon: "lunch", title: "Tới giờ nạp năng lượng", text: "Trưa nay ăn gì nè? Rời màn hình một chút, ăn ngon rồi khoe một khoảnh khắc với tụi mình nha." },
  { minute: 1050, icon: "sunset", title: "Một nhịp nghỉ cuối chiều", text: "Ai tan ca thì về thong thả, ai còn làm nhớ nghỉ tay chút nha. Hôm nay có chuyện gì muốn kể không?" },
  { minute: 1260, icon: "moon", title: "Khép lại một ngày", text: "Gác lại chút bận rộn, dành thời gian cho mình nha. Một điều nhỏ làm bạn vui hôm nay là gì?" },
] as const;
export function dailyReminder(now: number, timezone = 25200) {
  const local = new Date(now + timezone * 1000), minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const slot = slots.find((s) => minute >= s.minute && minute < s.minute + 45);
  return slot ? { ...slot, event: `daily-${local.toISOString().slice(0, 10)}-${slot.icon}`, deliverBy: now + (slot.minute + 45 - minute) * 60000 } : undefined;
}
export function weatherSignature(report: WeatherReport) {
  return JSON.stringify([report.conditionId, report.icon, report.temperature, report.feelsLike, report.humidity, report.windKph, report.rainMm, report.forecastAvailable,
    report.forecast.slice(0, 4).map((p) => [p.at, p.temperature, p.conditionId, p.rainChance])]);
}
export function weatherSummary(report: WeatherReport, now = Date.now()) {
  const id = report.conditionId;
  let tip = id < 300 ? "Có dông, nếu chưa cần ra ngoài thì trú một chút nha." : id < 600 ? "Nhớ ô hoặc áo mưa trước khi ra ngoài nha." : id < 700 ? "Mặc ấm và đi đường cẩn thận nha." : id < 800 ? "Tầm nhìn hơi hạn chế, đi đường chậm thôi nha." : report.feelsLike >= 33 ? "Nhớ mang nước, trưa nay ăn món thanh mát nhé?" : report.icon.endsWith("n") ? "Tối rồi, về thong thả và nhớ ăn gì ấm bụng nha." : "Trời dịu, tranh thủ nghỉ tay một chút nha.";
  const rain = report.forecast.find((p) => p.at > now && p.at <= now + 12 * 3600000 && p.rainChance !== null && p.rainChance >= .5 && p.conditionId >= 200 && p.conditionId < 600);
  const next = report.forecast.find((p) => p.at > now);
  if (rain && id >= 600) tip = "Vài giờ tới có thể mưa, để sẵn ô trong túi nha.";
  else if (next && !rain) tip += ` Mốc dự báo tiếp theo khoảng ${next.temperature}°C.`;
  return `${report.temperature}°C, ${report.description}. ${tip}`;
}
export function eligibleWeatherChange(previous: WeatherReport | undefined, report: WeatherReport, now = Date.now()) {
  return !!previous && !report.stale && now - report.fetchedAt < 30 * 60000 && report.observedAt >= previous.observedAt && weatherSignature(previous) !== weatherSignature(report);
}
