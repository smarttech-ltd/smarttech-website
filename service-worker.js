const CACHE_NAME = 'smarttech-v3';
const CORE_URLS = [
  '/',
  '/index.html',
  '/quiz.html',
  '/booking.html',
  '/updates.html',
  '/admin.html',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/manifest.json'
];

// Install - cache one by one so 1 missing file doesn't break all
self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of CORE_URLS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.log('SW: skip cache (missing):', url);
        }
      }
      await self.skipWaiting();
    })()
  );
});

// Activate - delete old caches (v1, v2 -> v3)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch - Smart caching
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Skip external: WhatsApp, Google Sheets, EmailJS, Drive, CDN
  if (url.origin !== self.location.origin) return;

  // Skip API / Apps Script calls - always network
  if (url.pathname.includes('script.google.com')) return;

  // For HTML pages: Network first, fallback to cache
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(e.request);
          const clone = res.clone();
          const cache = await caches.open(CACHE_NAME);
          // Don't cache URLs with ?utm_source=pwa as separate - cache as index
          cache.put(e.request, clone).catch(()=>{});
          return res;
        } catch (err) {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          // Offline fallback: try index.html
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('<h1 style="text-align:center;font-family:sans-serif;padding:40px">📶 You are offline<br><br>SmartTech needs internet for first load.<br>Please reconnect.</h1>', { headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
    return;
  }

  // For images / CSS / JS / manifest / icons: Cache first, then network + update cache
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request, { ignoreSearch: true });
      if (cached) {
        // Update in background (stale-while-revalidate)
        fetch(e.request).then(async (res) => {
          if (res && res.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(e.request, res.clone()).catch(()=>{});
          }
        }).catch(()=>{});
        return cached;
      }
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(e.request, res.clone()).catch(()=>{});
        }
        return res;
      } catch (err) {
        // If image fails offline, return logo placeholder
        if (e.request.destination === 'image') {
          const logo = await caches.match('/logo-192.png');
          if (logo) return logo;
        }
        throw err;
      }
    })()
  );
});

// Push - from server / Admin (handles both text and JSON)
self.addEventListener('push', (e) => {
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
    icon: '/logo-192.png',
    badge: '/logo-192.png',
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
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'notify', title: data.title, body: data.body, link: data.link || data.url || '/updates.html' });
      });
    })
  );
});

// Notification click - FIXED: opens the link Admin chose, not just /
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const action = e.action;
  if (action === 'close') return;

  let url = '/updates.html';
  if (e.notification.data && e.notification.data.url) {
    url = e.notification.data.url;
  }
  const fullUrl = url.startsWith('http') ? url : new URL(url, self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'notify-click', url: fullUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});

// Allow pages to tell SW to skip waiting (for instant update)
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'notify') {
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage(e.data));
    });
  }
});
