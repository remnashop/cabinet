// Push only: no fetch handler, nothing cached.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Remnashop", {
        body: data.body || "",
        icon: data.icon || "/icon-192.png",
        badge: "/badge-96.png",
        tag: data.tag || "cabinet",
        renotify: true,
        data: { url: data.url || "/" },
      }),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => clients.forEach((client) => client.postMessage({ type: "notification" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  // own origin only: a notification never opens another site
  const url = target.origin === self.location.origin ? target.href : new URL("/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        open.postMessage({ type: "navigate", url });
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
