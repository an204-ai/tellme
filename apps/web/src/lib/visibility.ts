import type {
  AppData,
  Privacy,
} from "./types";

export function canView(
  authorId: string,
  privacy: Privacy,
  data: Pick<AppData, "blocked" | "connections">,
) {
  return (
    !data.blocked.includes(authorId) &&
    (authorId === "me" ||
      (privacy !== "private" && data.connections.includes(authorId)))
  );
}
