import type { Comment, User } from "./models.js";
export function isSuspended(user: Pick<User, "suspension">, now = Date.now()) {
  if (!user.suspension) return false;
  if (!user.suspension.until) return true;
  const expires = new Date(user.suspension.until).getTime();
  return !Number.isFinite(expires) || expires > now;
}
/** Include all descendants, including old nested replies, without an O(n²) DTO scan. */
export function hiddenCommentIds(comments: Pick<Comment, "id" | "parentId" | "moderation">[]) {
  const hidden = new Set(comments.filter((comment) => comment.moderation?.hidden).map((comment) => comment.id));
  const children = new Map<string, string[]>();
  for (const comment of comments) if (comment.parentId) { const list = children.get(comment.parentId) || []; list.push(comment.id); children.set(comment.parentId, list); }
  const queue = [...hidden];
  for (let i = 0; i < queue.length; i++) for (const id of children.get(queue[i]!) || []) if (!hidden.has(id)) { hidden.add(id); queue.push(id); }
  return hidden;
}
