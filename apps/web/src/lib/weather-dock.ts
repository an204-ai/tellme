export type WeatherDock = { edge: "left" | "right" | "top" | "bottom"; ratio: number };
export type DockBounds = { left: number; top: number; right: number; bottom: number };
export const initialWeatherDock: WeatherDock = { edge: "right", ratio: .62 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
export function validWeatherDock(value: unknown): WeatherDock {
  if (!value || typeof value !== "object") return initialWeatherDock;
  const candidate = value as WeatherDock;
  return ["left", "right", "top", "bottom"].includes(candidate.edge) && Number.isFinite(candidate.ratio) ? { edge: candidate.edge, ratio: clamp(candidate.ratio, 0, 1) } : initialWeatherDock;
}
export function dockPoint(dock: WeatherDock, width: number, height: number, bounds: DockBounds) {
  const right = Math.max(bounds.left, bounds.right - width), bottom = Math.max(bounds.top, bounds.bottom - height);
  return { x: dock.edge === "left" ? bounds.left : dock.edge === "right" ? right : bounds.left + (right - bounds.left) * dock.ratio,
    y: dock.edge === "top" ? bounds.top : dock.edge === "bottom" ? bottom : bounds.top + (bottom - bounds.top) * dock.ratio };
}
export function nearestWeatherDock(x: number, y: number, width: number, height: number, bounds: DockBounds): WeatherDock {
  const right = Math.max(bounds.left, bounds.right - width), bottom = Math.max(bounds.top, bounds.bottom - height);
  x = clamp(x, bounds.left, right); y = clamp(y, bounds.top, bottom);
  const distances = { left: x - bounds.left, right: right - x, top: y - bounds.top, bottom: bottom - y };
  const edge = (Object.keys(distances) as WeatherDock["edge"][]).sort((a, b) => distances[a] - distances[b])[0]!;
  return { edge, ratio: edge === "left" || edge === "right" ? (y - bounds.top) / Math.max(1, bottom - bounds.top) : (x - bounds.left) / Math.max(1, right - bounds.left) };
}
export function weatherHintPoint(dock: WeatherDock, x: number, y: number, cardWidth: number, cardHeight: number, width: number, height: number, bounds: DockBounds) {
  const horizontal = dock.edge === "top" || dock.edge === "bottom";
  const bx = horizontal ? x + (cardWidth - width) / 2 : dock.edge === "left" ? x + cardWidth + 10 : x - width - 10;
  const by = dock.edge === "top" ? y + cardHeight + 10 : dock.edge === "bottom" ? y - height - 10 : y;
  const point = { x: clamp(bx, bounds.left, bounds.right - width), y: clamp(by, bounds.top, bounds.bottom - height) };
  const overlaps = point.x < x + cardWidth && point.x + width > x && point.y < y + cardHeight && point.y + height > y;
  return overlaps ? null : point;
}
export function weatherCloudPoint(dock: WeatherDock, x: number, y: number, cardWidth: number, cardHeight: number, width: number, height: number, bounds: DockBounds) {
  const gap = 16;
  const centerX = clamp(x + (cardWidth - width) / 2, bounds.left, bounds.right - width);
  const centerY = clamp(y + (cardHeight - height) / 2, bounds.top, bounds.bottom - height);
  const above = { x: centerX, y: y - height - gap, tailSide: "bottom" as const };
  const alternatives = [
    { x: centerX, y: y + cardHeight + gap, tailSide: "top" as const, room: bounds.bottom - y - cardHeight },
    { x: x + cardWidth + gap, y: centerY, tailSide: "left" as const, room: bounds.right - x - cardWidth },
    { x: x - width - gap, y: centerY, tailSide: "right" as const, room: x - bounds.left },
  ].sort((a, b) => b.room - a.room);
  // Prefer above; otherwise use the roomiest side that fits the entire cloud.
  for (const point of [above, ...alternatives]) {
    if (point.x >= bounds.left && point.y >= bounds.top && point.x + width <= bounds.right && point.y + height <= bounds.bottom) {
      return { x: point.x, y: point.y, tailSide: point.tailSide };
    }
  }
  // Very short/zoomed viewports may leave no non-overlapping placement.
  // Keep the message inside the viewport instead of hiding it or clipping text.
  const fallbackY = clamp(above.y, bounds.top, bounds.bottom - height);
  return { x: centerX, y: fallbackY, tailSide: fallbackY + height <= y + cardHeight / 2 ? "bottom" : dock.edge === "left" ? "left" : "right" };
}
