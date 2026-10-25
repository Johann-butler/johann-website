// Cache-Version bei jedem Website-Release ändern. Kein sofortiges skipWaiting!
const CACHE = 'johann-shell-internet-1792926628101144300';
const SHELL = ['./johann-heimdall-dashboard-v23.js', './johann-heimdall-dashboard-v22.js', './johann-heimdall-dashboard-v21.js', './johann-heimdall-dashboard-v2.js', './johann-heimdall-center-v1.js', './johann-mail-entry.js', './johann-mail-ui.js', './johann-mail.css', './johann-studio-entry.js', './johann-push.js', './', './index.html', './manifest.webmanifest', './johann-icon-192.png', './johann-icon-512.png', './johann-icon-180.png'];
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
// HEIMDALL_PUSH_TARGET_V2: dedicated detail targets, other notification modules retained.
importScripts('./heimdall-notices-v2.js');
function heimdallTargetV2(data,notice){
 let candidate;try{candidate=new URL(data.url||'/?johannPush=1',self.location.origin)}catch{candidate=new URL('/?johannPush=1',self.location.origin)}
 if(candidate.origin!==self.location.origin)candidate=new URL('/?johannPush=1',self.location.origin);
 const tag=String(data.tag||''),title=String(data.title||''),own=/heimdall|johann-wifi|johann-home-wifi/i.test(tag)||/HEIMDALL|WLAN-Gerät|WLAN-Beobachtung/i.test(title);
 if(own){
  const allowed=['overview','network','reports','events','asgard','capabilities'];let tab=candidate.searchParams.get('heimdall');
  if(!allowed.includes(tab))tab=/wifi|wlan/i.test(tag+' '+title)?'network':/nacht|night/i.test(tag+' '+title)?'reports':'overview';
  const source=candidate;candidate=new URL('/?heimdall='+tab,self.location.origin);
  for(const k of ['report','event']){const id=source.searchParams.get(k);if(/^[a-f0-9]{32}$/.test(id||''))candidate.searchParams.set(k,id)}
  if(notice?.id)candidate.searchParams.set('notice',notice.id);
 }
 return{url:candidate.href,own};
}
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 const notice=HeimdallNoticesV2.record(data),target=heimdallTargetV2(data,notice);
 event.waitUntil((async()=>{
  if(target.own){try{await HeimdallNoticesV2.put(notice)}catch{}}
  let url=target.url,johannMessage=null;
  if(!target.own&&typeof JohannMeldungen!=='undefined'){johannMessage=JohannMeldungen.record(data);try{await JohannMeldungen.put(johannMessage)}catch{}url=new URL('/?johannMeldung='+johannMessage.id,self.location.origin).href}
  await self.registration.showNotification(String(data.title||'Johann').slice(0,180),{body:String(data.body||'').slice(0,1000),icon:'./johann-icon-192.png',badge:'./johann-icon-192.png',tag:String(data.tag||'johann').slice(0,180),data:{url,heimdallNotice:target.own?notice:null,johannMessage}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const d=event.notification.data||{},context=d.heimdallNotice,target=heimdallTargetV2({url:d.url,tag:event.notification.tag,title:event.notification.title},context);let url=target.url;
  if(context&&HeimdallNoticesV2.valid(context.id)){try{await HeimdallNoticesV2.put(context)}catch{}}
  if(!target.own&&d.johannMessage&&typeof JohannMeldungen!=='undefined'&&JohannMeldungen.valid(d.johannMessage)){try{await JohannMeldungen.put(d.johannMessage)}catch{}url=new URL('/?johannMeldung='+d.johannMessage.id,self.location.origin).href}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin!==self.location.origin)continue;try{const next=await client.navigate(url);await(next||client).focus();return}catch{}}
  await self.clients.openWindow(url);
 })());
});
