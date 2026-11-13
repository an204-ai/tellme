import type { User } from "./models.js";
export function isSuspended(user: Pick<User, "suspension">, now = Date.now()) {
  if (!user.suspension) return false;
  if (!user.suspension.until) return true;
  const expires = new Date(user.suspension.until).getTime();
  return !Number.isFinite(expires) || expires > now;
}
