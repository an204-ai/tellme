export function formatMusicTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds)), minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function parseMusicTime(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d{1,4}$/.test(part))) return null;
  const numbers = parts.map(Number);
  if (numbers.at(-1)! >= 60 || (parts.length === 3 && numbers[1]! >= 60)) return null;
  const total = numbers.reduce((sum, value) => sum * 60 + value, 0);
  return total <= 86400 ? total : null;
}
