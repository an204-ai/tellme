import type { CommentMedia } from "./types";

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}
interface GiphyEntry {
  id: string;
  title: string;
  images: {
    fixed_width: GiphyImage;
    fixed_width_small: GiphyImage;
    fixed_width_downsampled: GiphyImage;
  };
}
export interface GiphyResult extends CommentMedia {
  preview: string;
}
export async function findGiphy(
  kind: "gif" | "sticker",
  search: string,
  offset: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    kind,
    q: search,
    offset: String(offset),
  });
  const response = await fetch(`/api/media/giphy?${params}`, {
    signal,
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Giphy đang giới hạn lượt tìm kiếm. Bạn thử lại sau một chút nhé."
        : "Chưa tải được Giphy. Bạn thử lại nhé.",
    );
  const body = (await response.json()) as {
    data: GiphyEntry[];
    pagination: { count: number; total_count: number; offset: number };
  };
  return {
    items: body.data.map((item): GiphyResult => {
      const image = item.images.fixed_width;
      return {
        id: item.id,
        kind,
        url: image.url,
        preview: (
          item.images.fixed_width_small ||
          item.images.fixed_width_downsampled ||
          image
        ).url,
        alt: item.title || (kind === "gif" ? "Ảnh GIF" : "Sticker"),
        width: Number(image.width) || 200,
        height: Number(image.height) || 200,
      };
    }),
    next:
      offset + body.pagination.count < body.pagination.total_count &&
      body.pagination.count > 0
        ? offset + body.pagination.count
        : undefined,
  };
}

export interface GiphyCursor {
  gif: number | null;
  sticker: number | null;
}
export async function findGiphyMixed(
  search: string,
  cursor: GiphyCursor,
  signal?: AbortSignal,
) {
  const [gifs, stickers] = await Promise.all([
    cursor.gif === null
      ? Promise.resolve({ items: [] as GiphyResult[], next: undefined })
      : findGiphy("gif", search, cursor.gif, signal),
    cursor.sticker === null
      ? Promise.resolve({ items: [] as GiphyResult[], next: undefined })
      : findGiphy("sticker", search, cursor.sticker, signal),
  ]);
  const items: GiphyResult[] = [];
  for (let i = 0; i < Math.max(gifs.items.length, stickers.items.length); i++) {
    if (gifs.items[i]) items.push(gifs.items[i]!);
    if (stickers.items[i]) items.push(stickers.items[i]!);
  }
  return {
    items,
    next:
      gifs.next === undefined && stickers.next === undefined
        ? undefined
        : { gif: gifs.next ?? null, sticker: stickers.next ?? null },
  };
}
