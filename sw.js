const CACHE = 'ot-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  // Map tiles — cache-first
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => r || fetch(e.request).then(res => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => new Response('', { status: 404 })))
      )
    );
    return;
  }

  // Google Fonts resources — cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => r || fetch(e.request).then(res => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => caches.match(e.request)))
      )
    );
    return;
  }

  // Supabase API — network-first
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
        }
        return res;
      }).catch(() => caches.match(e.request).then(r => r || new Response('[]', {
        headers: { 'Content-Type': 'application/json' }
      })))
    );
    return;
  }

  // CDN scripts (Leaflet, jsPDF, etc.) — cache-first
  if (url.hostname === 'unpkg.com' || url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => r || fetch(e.request).then(res => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => caches.match(e.request)))
      )
    );
    return;
  }

  // App shell — cache-first, update in background
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => {
          const net = fetch(e.request).then(res => {
            if (res.ok) c.put(e.request, res.clone());
            return res;
          }).catch(() => r);
          return r || net;
        })
      )
    );
    return;
  }

  // Everything else — network-first
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Listen for tile download messages from the app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CACHE_TILES') {
    const urls = e.data.urls;
    caches.open(CACHE).then(async c => {
      let done = 0;
      for (let i = 0; i < urls.length; i += 6) {
        const batch = urls.slice(i, i + 6);
        await Promise.all(batch.map(u =>
          c.match(u).then(r => r || fetch(u).then(res => {
            if (res.ok) c.put(u, res.clone());
            return res;
          }).catch(() => null))
        ));
        done += batch.length;
        e.source.postMessage({ type: 'TILES_PROGRESS', done, total: urls.length });
      }
      e.source.postMessage({ type: 'TILES_DONE', total: urls.length });
    });
  }
});
