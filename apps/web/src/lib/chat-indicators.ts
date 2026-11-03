import type { Conversation } from './types';
import type { TypingPeer } from './chat-realtime';

export function typingUsers(peers: Record<string, TypingPeer>, conversationId: string, now = Date.now()): string[] {
  return [...new Set(Object.values(peers)
    .filter((peer) => peer.conversationId === conversationId && peer.userId !== 'me' && peer.expires > now)
    .map((peer) => peer.userId))];
}

/** Place each reader once, beneath their latest read outgoing message, never a pending send. */
export function messageReaders(chat: Conversation): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const outgoing = chat.messages.filter((message) => message.own && !message.pending).reverse();
  for (const [userId, at] of Object.entries(chat.readAt || {})) {
    if (userId === 'me') continue;
    const message = outgoing.find((entry) => entry.at <= at);
    if (!message) continue;
    result.set(message.id, [...(result.get(message.id) || []), userId]);
  }
  return result;
}
