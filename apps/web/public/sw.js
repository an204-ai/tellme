self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Bạn có thông báo mới trên Tellme." };
  }
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
