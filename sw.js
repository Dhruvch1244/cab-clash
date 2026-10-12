/* Offline cache: every file the game needs is stored on first visit, then served from the
   cache so the game runs with no connection. Cached files refresh in the background when the
   server is reachable. Tracker calls (/api/) and the admin screen always go to the network. */
const VERSION='cab-clash-v4';
const FILES=['./','index.html','duel.html','games.js','sfx.js','tracker.js','icon.svg','manifest.webmanifest',
  'fonts/fonts.css','fonts/rubik-mono-one.woff2','fonts/barlow-condensed-500.woff2','fonts/barlow-condensed-700.woff2'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin||url.pathname.includes('/api/')||/\/admin(\.html)?$/.test(url.pathname))return;
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    const fresh=fetch(e.request).then(res=>{if(res.ok)c.put(e.request,res.clone());return res});
    if(hit){fresh.catch(()=>{});return hit}
    return fresh;
  }));
});
