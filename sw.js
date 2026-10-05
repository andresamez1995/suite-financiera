/* Mi Suite Financiera — service worker
   Estrategia: "red primero, caché de respaldo".
   - Con internet: siempre baja la versión más reciente y la deja guardada.
   - Sin internet (o red muy lenta): sirve lo último que guardó, así que la app abre igual.
   - Cuando cambia este archivo (sube VERSION), el navegador instala el SW nuevo en segundo plano
     y la app muestra el aviso "Hay una versión nueva · Actualizar". */
const VERSION = 'v24';
const CACHE = 'suite-cache-' + VERSION;
const PRECACHE = ['./', './index.html', './calculadora/index.html', './gastos/index.html', './manifest.json', './suite-tema.css', './suite-tema.js', './suite-iconos.js', './suite-nav.js', './suite-config.js', './suite-sync.js', './suite-sync-core.js', './suite-ui.js', './privacidad.html',
  './fonts/inter-latin-wght-normal.woff2', './fonts/space-grotesk-latin-wght-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'];
const TIMEOUT_MS = 3500;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async url => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error('No se pudo guardar ' + url + ' (' + res.status + ')');
      await cache.put(url, res);
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('suite-cache-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function fetchFresh(url, ms) {
  const ctrl = new AbortController();
  const timer = ms ? setTimeout(() => ctrl.abort(), ms) : null;
  return fetch(url, { cache: 'no-cache', credentials: 'same-origin', signal: ctrl.signal })
    .finally(() => { if (timer) clearTimeout(timer); });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    try {
      const res = await fetchFresh(req.url, cached ? TIMEOUT_MS : 0);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (cached) return cached;
      if (req.mode === 'navigate') { const fallback = await cache.match('./index.html'); if (fallback) return fallback; }
      throw err;
    }
  })());
});
