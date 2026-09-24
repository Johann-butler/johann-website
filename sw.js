// Cache-Version bei jedem Website-Release ändern. Kein sofortiges skipWaiting!
const CACHE = 'johann-shell-v11-update-1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './johann-icon-192.png', './johann-icon-512.png', './johann-icon-180.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('johann-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)));
      }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (!SHELL.some(path => url.pathname.endsWith(path.replace('./', '/')))) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
