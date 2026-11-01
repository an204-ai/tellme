import type { AppData, Conversation } from "./types.ts";
type Relations = Pick<AppData, "connections" | "blocked" | "authenticated">;
export function canMessagePerson(id: string, data: Relations) {
  return data.authenticated !== false && id !== "me" && data.connections.includes(id) && !data.blocked.includes(id);
}
export function canMessageConversation(chat: Conversation, data: Relations) {
  const others = (chat.participantIds || (chat.kind === "group" ? [] : [chat.userId])).filter((id) => id !== "me");
  if (chat.kind === "group") return data.authenticated !== false && chat.canMessage === true && !!chat.participantIds?.includes("me") && others.length >= 1 && others.every((id) => !data.blocked.includes(id));
  return chat.canMessage !== false && others.length > 0 && others.every((id) => canMessagePerson(id, data));
}
