const CACHE='unity-mix-shell-v28';
const SHELL=['/silver-ring/src/frame-time.js','/silver-ring/src/render-frame.js','/silver-ring/src/project-cabinet.js','/silver-ring/src/render-profile.js','/silver-ring/audio/breakthrough-second-stage.mp3','/silver-ring/audio/jackpot-third-stage.mp3','/silver-ring/src/coin-engraving.js','/silver-ring/assets/infernal-backplate.webp','/silver-ring/src/recorded-sounds.js','/silver-ring/audio/breakthrough.mp3','/silver-ring/audio/jackpot.mp3','/silver-ring/audio/zawa.mp3','/silver-ring/src/breakthrough-sound.js','/silver-ring/src/camera-pose.js','/silver-ring/src/cabinet-art.js','/silver-ring/src/banknote-rain.js','/silver-ring/presentation.css','/silver-ring/src/presentation.js','/js/silver-ring/shell.js','/silver-ring/index.html','/silver-ring/style.css','/silver-ring/NOTICE.txt','/silver-ring/src/main.js','/silver-ring/src/ui.js','/silver-ring/src/physics.js','/silver-ring/src/scene.js','/silver-ring/src/seed.js','/silver-ring/src/audio.js','/silver-ring/src/fx.js','/silver-ring/src/config.js','/vendor/three/addons/shaders/CopyShader.js','/vendor/three/addons/shaders/OutputShader.js','/vendor/three/addons/shaders/LuminosityHighPassShader.js','/vendor/three/addons/postprocessing/OutputPass.js','/vendor/three/addons/postprocessing/EffectComposer.js','/vendor/three/addons/postprocessing/UnrealBloomPass.js','/vendor/three/addons/postprocessing/RenderPass.js','/vendor/three/addons/postprocessing/Pass.js','/vendor/three/addons/postprocessing/MaskPass.js','/vendor/three/addons/postprocessing/ShaderPass.js','/vendor/three/addons/controls/OrbitControls.js','/vendor/three/addons/utils/BufferGeometryUtils.js','/vendor/three/LICENSE','/js/abyss/rotor-mechanism.js','/js/abyss/challenge-policy.js','/js/abyss/challenge-controls.js','/js/abyss/si-v4/si-config.js','/js/abyss/si-v4/si-engine.js','/js/abyss/si-v4/si-geometry.js','/js/abyss/si-v4/si-renderer.js','/js/abyss/si-v4/board-routes.js','/js/abyss/si-v4/tray-layout.js','/js/abyss/si-v4/orbital-mesh.js','/js/abyss/si-v4/cabinet.js','/js/abyss/board-routes.js','/js/abyss/tray-layout.js','/js/abyss/orbital-mesh.js','/js/abyss/cabinet.js','/js/abyss/play-layout.js','/js/abyss/si-v3/si-config.js','/js/abyss/si-v3/si-engine.js','/js/abyss/si-v3/si-geometry.js','/js/abyss/si-v3/si-renderer.js','/js/abyss/si-v2/si-config.js','/js/abyss/si-v2/si-engine.js','/js/abyss/si-v2/si-geometry.js','/js/abyss/si-v2/si-renderer.js','/js/abyss/presentation.js','/js/abyss/si-v1/si-renderer.js','/js/abyss/si-v1/si-config.js','/js/abyss/si-v1/si-engine.js','/js/abyss/si-v1/si-geometry.js','/js/abyss/si-config.js','/js/abyss/si-engine.js','/js/abyss/si-geometry.js','/js/abyss/si-renderer.js','/js/abyss/legacy/config.js','/js/abyss/legacy/engine.js','/js/abyss/legacy/physics.js','/js/abyss/legacy/renderer.js','/vendor/rapier/rapier.mjs','/vendor/earcut/earcut.js','/abyss.css','/js/abyss/screen.js','/js/abyss/ui.js','/js/abyss/ui-panels.js','/js/abyss/config.js','/js/abyss/engine.js','/js/abyss/physics.js','/js/abyss/renderer.js','/js/abyss/audio.js','/js/abyss/analysis.js','/js/abyss/storage.js','/js/abyss/replay.js','/js/abyss/research-worker.js','/vendor/three/three.module.js','/vendor/three/three.core.js','/bonus.css','/js/bonus/config.js','/js/bonus/physics.js','/js/bonus/model.js','/js/bonus/render.js','/js/bonus/screen.js','/js/bonus/audio.js','/js/cpu.js','/js/scale.js','/js/events/screen.js','/js/events/individual.js','/js/events/guessing.js','/js/events/teams.js','/js/events/editor.js','/js/events/host.js','/','/style.css','/js/app.js','/js/dom.js','/js/realtime.js','/js/home.js','/js/lobby.js','/js/answer.js','/js/results.js','/js/game.js','/js/final.js','/js/share.js','/assets/unity-mark.webp','/assets/fonts/cormorant-garamond-latin.woff'];
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
