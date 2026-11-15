/** Keep every day and its date label inside the measured map, with readable photo stops. */
export function monthRoute(month: string, width: number, height: number) {
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const columns = width < 480 ? 4 : 6;
  const rows = Math.ceil(count / columns);
  const insetX = Math.min(36, Math.max(26, width * .08));
  const insetY = 36;
  const stepX = (width - insetX * 2) / (columns - 1);
  const stepY = (height - insetY * 2) / (rows - 1);
  const size = Math.floor(Math.min(40, stepX - 18, stepY - 18));
  const points = Array.from({ length: count }, (_, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    return {
      day: `${month}-${String(index + 1).padStart(2, "0")}`,
      x: insetX + column * stepX,
      y: column % 2 ? insetY + row * stepY : height - insetY - row * stepY,
    };
  });
  let path = "";
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (!previous) path = `M ${point.x} ${point.y}`;
    else if (previous.x === point.x) path += ` L ${point.x} ${point.y}`;
    else {
      const curveY = point.y < height / 2 ? point.y - 24 : point.y + 24;
      path += ` C ${previous.x} ${curveY}, ${point.x} ${curveY}, ${point.x} ${point.y}`;
    }
  });
  return { points, path, size: Math.max(24, size), width, height };
}
