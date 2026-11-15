/** Only return an internal app destination after a session cookie has been set. */
export function authDestination(next: string | null) {
  if (!next || !next.startsWith('/')) return '/community/today';
  try {
    const base = 'https://tellme.invalid';
    const url = new URL(next, base);
    if (url.origin !== base || !/^\/community(?:\/|$)/.test(url.pathname)) return '/community/today';
    return url.pathname + url.search + url.hash;
  } catch { return '/community/today'; }
}
