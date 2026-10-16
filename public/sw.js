const CACHE='unity-mix-shell-v10';
const SHELL=['/js/abyss/si-v2/si-config.js','/js/abyss/si-v2/si-engine.js','/js/abyss/si-v2/si-geometry.js','/js/abyss/si-v2/si-renderer.js','/js/abyss/presentation.js','/js/abyss/si-v1/si-renderer.js','/js/abyss/si-v1/si-config.js','/js/abyss/si-v1/si-engine.js','/js/abyss/si-v1/si-geometry.js','/js/abyss/si-config.js','/js/abyss/si-engine.js','/js/abyss/si-geometry.js','/js/abyss/si-renderer.js','/js/abyss/legacy/config.js','/js/abyss/legacy/engine.js','/js/abyss/legacy/physics.js','/js/abyss/legacy/renderer.js','/vendor/rapier/rapier.mjs','/vendor/earcut/earcut.js','/abyss.css','/js/abyss/screen.js','/js/abyss/ui.js','/js/abyss/ui-panels.js','/js/abyss/config.js','/js/abyss/engine.js','/js/abyss/physics.js','/js/abyss/renderer.js','/js/abyss/audio.js','/js/abyss/analysis.js','/js/abyss/storage.js','/js/abyss/replay.js','/js/abyss/research-worker.js','/vendor/three/three.module.js','/vendor/three/three.core.js','/bonus.css','/js/bonus/config.js','/js/bonus/physics.js','/js/bonus/model.js','/js/bonus/render.js','/js/bonus/screen.js','/js/bonus/audio.js','/js/cpu.js','/js/scale.js','/js/events/screen.js','/js/events/individual.js','/js/events/guessing.js','/js/events/teams.js','/js/events/editor.js','/js/events/host.js','/','/style.css','/js/app.js','/js/dom.js','/js/realtime.js','/js/home.js','/js/lobby.js','/js/answer.js','/js/results.js','/js/game.js','/js/final.js','/js/share.js','/assets/unity-mark.webp','/assets/fonts/cormorant-garamond-latin.woff'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('unity-mix-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname==='/ws')return;
 event.respondWith((async()=>{
  try{
   const code=/\.(?:m?js|css|html)$/.test(url.pathname)||event.request.mode==='navigate';
   const response=await fetch(event.request,code?{cache:'no-cache'}:undefined);
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}
   return response;
  }catch{
   const cache=await caches.open(CACHE);return (await cache.match(event.request))||(event.request.mode==='navigate'?await cache.match('/'):Response.error());
  }
 })());
});
