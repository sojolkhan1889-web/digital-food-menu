// Lightweight Service Worker for Digital Food Menu Web Push & Follower Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const sliderId = notifData.sliderId || '';
  const foodId = notifData.foodId || '';

  // Construct target URL containing query parameters for the offer
  let targetUrl = notifData.url || '/';
  if (sliderId && !targetUrl.includes('openSlide=')) {
    targetUrl = `/?openSlide=${encodeURIComponent(sliderId)}${foodId ? `&foodId=${encodeURIComponent(foodId)}` : ''}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing tab/window is open, focus and send notification click message
      for (const client of clientList) {
        if ('postMessage' in client) {
          client.postMessage({
            type: 'DGM_NOTIFICATION_CLICK',
            data: { sliderId, foodId, url: targetUrl }
          });
        }
        if ('focus' in client) {
          client.focus();
        }
        if ('navigate' in client && targetUrl) {
          return client.navigate(targetUrl);
        }
        return;
      }

      // 2. If no window is currently open, open a new window at the targetUrl
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
