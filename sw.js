const CACHE = 'johann-shell-v10';
const SHELL = ['./','./index.html','./manifest.webmanifest','./johann-icon-192.png','./johann-icon-512.png','./johann-icon-180.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('johann-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
 const req=event.request; if(req.method!=='GET')return;
 const u=new URL(req.url); if(u.origin!==self.location.origin)return;
 if(req.mode==='navigate') {event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));}return res;}).catch(()=>caches.match('./index.html')));return;}
 if(!SHELL.some(path=>u.pathname.endsWith(path.replace('./','/'))))return;
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});