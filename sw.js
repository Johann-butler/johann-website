// Cache-Version bei jedem Website-Release ändern. Kein sofortiges skipWaiting!
const CACHE = 'johann-shell-heimdall-home-v2-1792768091290075300';
const SHELL = ['./johann-heimdall-center-v1.js', './johann-mail-entry.js', './johann-mail-ui.js', './johann-mail.css', './johann-studio-entry.js', './johann-push.js', './', './index.html', './manifest.webmanifest', './johann-icon-192.png', './johann-icon-512.png', './johann-icon-180.png'];
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


// JOHANN PUSH V1 — Cache- und Update-Verhalten oben bleibt bestehen.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 const title=typeof data.title==='string'?data.title.slice(0,120):'Johann';
 const body=typeof data.body==='string'?data.body.slice(0,600):'Eine neue Mitteilung von Johann ist da.';
 let url=new URL('/?johannPush=1',self.location.origin);try{const candidate=new URL(data.url||'',self.location.origin);if(candidate.origin===self.location.origin)url=candidate}catch{}
 event.waitUntil(self.registration.showNotification(title,{body,icon:'./johann-icon-192.png',badge:'./johann-icon-192.png',tag:typeof data.tag==='string'?data.tag.slice(0,100):'johann',data:{url:url.href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url=new URL('/?johannPush=1',self.location.origin);try{const candidate=new URL(event.notification.data?.url||'',self.location.origin);if(candidate.origin===self.location.origin)url=candidate}catch{}
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url.href);await client.focus();return}}await self.clients.openWindow(url.href)})());
});
