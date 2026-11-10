// Lightweight Service Worker for Digital Food Menu Web Push & Follower Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real-time OS Background Push Listener (Wakes up device when Chrome is closed / screen locked)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { title: '🔥 New Special Offer from Moneky Bhai!', body: event.data ? event.data.text() : '' };
    } catch (_) {}
  }

  const origin = self.location.origin;
  const title = data.title || '🔥 New Special Offer from Moneky Bhai!';
  let targetUrl = data.url || '/';
  if (data.sliderId && !targetUrl.includes('openSlide=')) {
    targetUrl = `/?openSlide=${encodeURIComponent(data.sliderId)}${data.foodId ? `&foodId=${encodeURIComponent(data.foodId)}` : ''}`;
  }

  // Construct absolute icon and badge URLs for bulletproof mobile delivery
  const iconUrl = (data.icon && !data.icon.startsWith('data:') && !data.icon.startsWith('/src/')) 
    ? (data.icon.startsWith('http') ? data.icon : `${origin}${data.icon.startsWith('/') ? '' : '/'}${data.icon}`)
    : `${origin}/monkey_bhai_logo.png`;

  let imageUrl = undefined;
  if (data.image && typeof data.image === 'string' && !data.image.startsWith('data:') && !data.image.startsWith('/src/')) {
    imageUrl = data.image.startsWith('http') ? data.image : `${origin}${data.image.startsWith('/') ? '' : '/'}${data.image}`;
  }

  const options = {
    body: data.body || 'Check out our newly published special dish on the 3D menu!',
    icon: iconUrl,
    badge: `${origin}/favicon.svg`,
    image: imageUrl,
    vibrate: [300, 100, 200, 100, 300],
    tag: data.tag || `dgm_${data.sliderId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: targetUrl,
      sliderId: data.sliderId || '',
      foodId: data.foodId || ''
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler (Brings user directly to the offer dish)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const sliderId = notifData.sliderId || '';
  const foodId = notifData.foodId || '';

  let targetUrl = notifData.url || '/';
  if (sliderId && !targetUrl.includes('openSlide=')) {
    targetUrl = `/?openSlide=${encodeURIComponent(sliderId)}${foodId ? `&foodId=${encodeURIComponent(foodId)}` : ''}`;
  }

  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing tab/window is open, focus and send notification click message
      for (const client of clientList) {
        if ('postMessage' in client) {
          client.postMessage({
            type: 'DGM_NOTIFICATION_CLICK',
            data: { sliderId, foodId, url: fullTargetUrl }
          });
        }
        if ('focus' in client) {
          client.focus();
        }
        if ('navigate' in client) {
          return client.navigate(fullTargetUrl);
        }
        return;
      }

      // 2. If no window is open (e.g. Chrome closed or background), open a new window at the targetUrl
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
