// Public artwork only. Protected avatars/photos and API/RSC/HTML always use
// the network, where the current session and audience can be checked.
const ART_CACHE_PREFIX = "tellme-public-images-";
const ART_CACHE = `${ART_CACHE_PREFIX}v1`;
const ART_LIMIT = 96;
const ART_TTL = 86400000;
function isPublicArt(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/brand/")) return true;
  if (url.pathname !== "/_next/image") return false;
  const source = url.searchParams.get("url");
  if (!source) return false;
  try {
    const original = new URL(source, self.location.origin);
    return original.origin === self.location.origin && (original.pathname.startsWith("/images/") || original.pathname.startsWith("/brand/"));
  } catch { return false; }
}
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(ART_CACHE_PREFIX) && name !== ART_CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
async function publicArt(request, event) {
  let cache;
  try { cache = await caches.open(ART_CACHE); } catch { return fetch(request); }
  const cached = await cache.match(request).catch(() => undefined);
  if (cached && Date.now() - Number(cached.headers.get("X-Tellme-Cached-At")) < ART_TTL) return cached;
  let response;
  try { response = await fetch(request, { cache: "no-cache" }); } catch (error) { if (cached) return cached; throw error; }
  if (response.ok && !response.redirected && response.headers.get("Content-Type")?.startsWith("image/")) {
    const copy = response.clone();
    const headers = new Headers(copy.headers);
    headers.set("X-Tellme-Cached-At", String(Date.now()));
    event.waitUntil((async () => {
      await cache.put(request, new Response(copy.body, { status: copy.status, statusText: copy.statusText, headers }));
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(0, keys.length - ART_LIMIT))) await cache.delete(key);
    })().catch(() => undefined));
  }
  return response;
}
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !isPublicArt(new URL(event.request.url))) return;
  event.respondWith(publicArt(event.request, event));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Bạn có thông báo mới trên Tellme." };
  }
  if (typeof payload.tag === "string" && payload.tag.startsWith("tellme-system-")) return;
  const title = typeof payload.title === "string" ? payload.title.slice(0, 80) : "Tellme";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 180) : "Bạn có thông báo mới.";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    if (clients.some((client) => client.visibilityState === "visible")) return;
    return self.registration.showNotification(title, {
      body,
      tag: typeof payload.tag === "string" ? payload.tag.slice(0, 100) : "tellme-notice",
      icon: typeof payload.icon === "string" && ["/brand/logos/tellme-symbol-on-light.png", "/images/reactions/like.png"].includes(payload.icon) ? payload.icon : "/brand/logos/tellme-symbol-on-light.png",
      badge: "/brand/logos/tellme-symbol-on-light.png",
      data: { url: typeof payload.url === "string" ? payload.url : "/community/today" },
    });
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedPath = event.notification.data?.url;
  const target = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? new URL(requestedPath, self.location.origin)
    : new URL("/community/today", self.location.origin);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const openClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (openClient) return openClient.navigate(target.href).then(() => openClient.focus());
    return self.clients.openWindow(target.href);
  }));
});
