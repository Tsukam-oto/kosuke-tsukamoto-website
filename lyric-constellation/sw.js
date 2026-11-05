/* Scoped to /lyric-constellation/. Private lyrics and auth/API requests are
 * NEVER intercepted. Prefer the network for code so stale JavaScript and CSS
 * cannot survive a manual page reload simply because old PWA assets exist. */
const CACHE='lyric-constellation-v3.3';
const CORE=[
 './','./index.html','./deep-reading.js','./semantic-stars.js',
 './semantic-stars.css','./visual-refresh.css','./mummy-research.js',
 './mummy-research-view.js','./mummy-research.css',
 './manifest.webmanifest','./icon.svg','./icon.png','./icon-512.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(key=>key.startsWith('lyric-constellation-')&&key!==CACHE).map(key=>caches.delete(key))
 )));
 self.clients.claim();
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||
    !url.pathname.startsWith('/lyric-constellation/'))return;
 const remember=response=>{
  if(response.ok){
   const copy=response.clone();
   caches.open(CACHE).then(cache=>cache.put(req.mode==='navigate'?'./index.html':req,copy)).catch(()=>{});
  }
  return response;
 };
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-store'}).then(remember)
   .catch(()=>caches.match('./index.html')));
  return;
 }
 if(req.destination==='script'||req.destination==='style'){
  event.respondWith(fetch(req,{cache:'no-store'}).then(remember)
   .catch(()=>caches.match(req)));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(remember)));
});
