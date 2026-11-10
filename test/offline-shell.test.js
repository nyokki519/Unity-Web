import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createApp} from '../src/server.js';

test('the offline shell can install from live HTTP assets without requesting retired games',async()=>{
 const app=createApp({database:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 try{
  const base=`http://127.0.0.1:${app.server.address().port}`,handlers={},requested=[];let installed=false,pending;
  const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
  const appSource=await readFile(new URL('../public/js/app.js',import.meta.url),'utf8');assert.match(source,/const CACHE='unity-mix-shell-v61'/);assert.match(appSource,/register\('\/sw\.js\?v=61'/,'the registration URL and cache revision stay aligned');
  vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>{handlers[name]=fn;},skipWaiting:async()=>{installed=true;}},Request:class{constructor(path,options){return new Request(new URL(path,base),options);}},caches:{open:async()=>({addAll:async(requests)=>{for(const request of requests){requested.push(request.url);const response=await fetch(request);assert.equal(response.status,200,request.url);}}})}});
  handlers.install({waitUntil:p=>{pending=p;}});await pending;
  assert.equal(installed,true);assert.ok(requested.length>100);assert.ok(requested.every(url=>!url.includes('/mechanical/')));
  const cached=new Set(requested.map(url=>new URL(url).pathname+new URL(url).search));
  assert.ok(cached.has('/js/events/rating.js?v=rating-v7'),'Rating choices are cached with the new neutral instructions');
  assert.ok(cached.has('/js/events/rating.css?v=rating-v8'),'Rating styles are cached with the revised question-neutral flow');
  assert.ok(cached.has('/js/events/tier.js?v=tier-board-v9'),'Tier interaction module is included with the fresh cache key');
  assert.ok(cached.has('/js/events/tier.css?v=tier-board-v7'),'Tier board styling is included with the fresh cache key');
  assert.ok(cached.has('/js/app.js?v=tier-board-v11'),'app module cache key is versioned');
  assert.ok(cached.has('/js/events/screen.js?v=tier-board-v11'),'event screen cache key is versioned');
  assert.ok(cached.has('/rating/verified/ai-latte-generated.webp'),'the optimized AI image is cached');
  assert.ok(cached.has('/rating/verified/rating-art-de-hooch.jpg'),'the source-backed art comparison image is cached');
  assert.ok(cached.has('/rating/verified/rating-art-vermeer.jpg'),'the source-backed art comparison image is cached');
  for(const name of ['moka','sumire','houma','kona']){assert.ok(cached.has(`/mahjong/assets/${name}.webp`),`${name} original portrait remains cached`);assert.ok(cached.has(`/mahjong/assets/${name}-portrait.webp`),`${name} new portrait is cached`);}
  assert.ok(cached.has('/mahjong/src/sound.js'),'the local reference sounds are cached offline');assert.ok(cached.has('/mahjong/src/tile-art.js'),'the local reference tile renderer is cached offline');assert.ok(cached.has('/mahjong/assets/kobalab/tiles/m1.gif'));assert.ok(cached.has('/mahjong/assets/kobalab/audio/dahai11.wav'));assert.ok(cached.has('/mahjong/vendor/majiang-ai.bundle.js'));assert.ok(cached.has('/mahjong-engine/reference-ai.js'));
 }finally{await app.close();}
});
