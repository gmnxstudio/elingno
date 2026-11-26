const CACHE_NAME = "elingno-v1";
const OFFLINE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Let API requests bypass standard static cache so dynamic data is always fresh,
  // while offline requests fallback gracefully
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        })
      );
    })
  );
});

// Push notification receiver
self.addEventListener("push", (event) => {
  let data = {
    title: "Elingno — Pengingat Tugas",
    body: "Ada catatan operasional yang membutuhkan perhatian Anda.",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon.svg",
    vibrate: [200, 100, 200],
    data: data.data || { url: "/" },
    actions: [
      { action: "open", title: "Buka Catatan" },
      { action: "dismiss", title: "Tutup" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then((focusedClient) => {
            if ("navigate" in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
