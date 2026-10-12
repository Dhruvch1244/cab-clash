/* Offline cache: every file the game needs is stored on first visit, then served
   from the cache so the game runs with no connection. Bump VERSION when files change. */
const VERSION='cab-clash-v1';
const FILES=['./','index.html','duel.html','games.js','sfx.js','icon.svg','manifest.webmanifest',
  'fonts/fonts.css','fonts/rubik-mono-one.woff2','fonts/barlow-condensed-500.woff2','fonts/barlow-condensed-700.woff2'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request)));
});
