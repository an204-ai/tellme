import type { User, Conversation } from "./models.js";
type Member = Pick<User, "_id" | "following" | "blocked">;

function availableMembers(ids: string[], people: Member[]) {
  const unique = [...new Set(ids)];
  const members = new Map(people.map((person) => [person._id, person]));
  if (unique.some((id) => !members.has(id))) return null;
  if (unique.some((id) => unique.some((other) => members.get(id)!.blocked.includes(other)))) return null;
  return { unique, members };
}

/** Group invitees must be the creator's friends; direct chats require mutual follows. */
export function canChatTogether(ids: string[], people: Member[], creatorId?: string) {
  const available = availableMembers(ids, people);
  if (!available || available.unique.length < 2) return false;
  const { unique, members } = available;
  if (creatorId) {
    if (!unique.includes(creatorId) || unique.length < 3) return false;
    const creator = members.get(creatorId)!;
    return unique.every((id) => id === creatorId || (creator.following.includes(id) && members.get(id)!.following.includes(creatorId)));
  }
  return unique.length === 2 && unique.every((id) => unique.every((other) => other === id || members.get(id)!.following.includes(other)));
}

/** Once invited, group membership permits chat without requiring member-to-member follows. */
export function canSendInConversation(chat: Pick<Conversation, "kind" | "participants">, people: Member[]) {
  if (chat.kind === "direct") return canChatTogether(chat.participants, people);
  const available = availableMembers(chat.participants, people);
  return !!available && available.unique.length >= 2;
}
