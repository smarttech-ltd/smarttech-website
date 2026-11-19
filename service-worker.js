const CACHE_NAME = 'smarttech-v2';
const urlsToCache = [
  '/index.html',
  '/quiz.html',
  '/booking.html',
  '/updates.html',
  '/admin.html',
  '/admin-dashboard.html',
  '/admin-notify.html',
  '/logo.png',
  '/manifest.json'
];

// Install - cache all pages
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch(err => console.log('SW install cache failed:', err))
  );
});

// Activate - delete old caches (v1 -> v2)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Cache first for static, Network first for pages
self.addEventListener('fetch', e => {
  // Skip non-GET and external requests (WhatsApp, Google, EmailJS)
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // For HTML pages: Network first, fallback to cache
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // For images / CSS / JS / logo: Cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

// Push - from server / Admin (handles both text and JSON)
self.addEventListener('push', e => {
  let data = { title: 'SmartTech LTD', body: 'New update from SmartTech!', link: '/updates.html' };
  try {
    if (e.data) {
      const text = e.data.text();
      try {
        data = { ...data, ...JSON.parse(text) };
      } catch (jsonErr) {
        data.body = text;
      }
    }
  } catch (err) {}

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    tag: 'smarttech-notify',
    renotify: true,
    data: { url: data.link || data.url || '/updates.html', title: data.title, body: data.body },
    actions: [
      { action: 'view', title: 'View →' },
      { action: 'close', title: 'Later' }
    ]
  };

  e.waitUntil(self.registration.showNotification(data.title, options));

  // Also tell open tabs to show toast + bell
  e.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'notify', title: data.title, body: data.body, link: data.link || data.url || '/updates.html' });
      });
    })
  );
});

// Notification click - FIXED: opens the link Admin chose, not just /
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action;
  if (action === 'close') return;

  let url = '/updates.html';
  if (e.notification.data && e.notification.data.url) {
    url = e.notification.data.url;
  }
  // If it's external (WhatsApp Channel), open as-is, else make it absolute
  const fullUrl = url.startsWith('http') ? url : new URL(url, self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If SmartTech already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'notify-click', url: fullUrl });
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});

// Allow pages to tell SW to skip waiting (for instant update)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'notify') {
    // Forward notification from admin-notify.html to all tabs
    self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
      clients.forEach(c => c.postMessage(e.data));
    });
  }
});