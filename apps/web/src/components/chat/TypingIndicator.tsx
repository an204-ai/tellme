"use client";
import { Avatar } from '@/components/ui/Primitives';
import type { Person } from '@/lib/types';

/** The owner's bouncing dots and shadows, shared by the chat bubble and inbox. */
export function TypingDots() {
  return <span className="typing-indicator" aria-hidden="true">
    <i className="typing-circle" /><i className="typing-circle" /><i className="typing-circle" />
    <i className="typing-shadow" /><i className="typing-shadow" /><i className="typing-shadow" />
  </span>;
}
export function TypingIndicator({ userIds, people, group = false, inline = false }: {
  userIds: string[]; people: Person[]; group?: boolean; inline?: boolean;
}) {
  if (!userIds.length) return null;
  const names = userIds.map((id) => people.find((person) => person.id === id)?.name || 'Một thành viên');
  const label = group ? `${names.join(', ')} đang soạn tin` : 'Đang soạn tin';
  return <span className={`chat-typing-bubble${inline ? ' is-inline' : ''}`} role="status" aria-label={label}>
    {group && <span className="chat-typing-avatars">{userIds.map((id) => <Avatar key={id} person={people.find((person) => person.id === id)} size="xs" />)}</span>}
    <span className="chat-typing-dots"><TypingDots /></span>
    {inline && <span className="sr-only">{label}</span>}
  </span>;
}
