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
  vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>{handlers[name]=fn;},skipWaiting:async()=>{installed=true;}},Request:class{constructor(path,options){return new Request(new URL(path,base),options);}},caches:{open:async()=>({addAll:async(requests)=>{for(const request of requests){requested.push(request.url);const response=await fetch(request);assert.equal(response.status,200,request.url);}}})}});
  handlers.install({waitUntil:p=>{pending=p;}});await pending;
  assert.equal(installed,true);assert.ok(requested.length>100);assert.ok(requested.every(url=>!url.includes('/mechanical/')));
  assert.ok(requested.some(url=>url.endsWith('/js/events/tier.js')),'Tier interaction module is included in the offline shell');
  assert.ok(requested.some(url=>url.endsWith('/js/events/tier.css')),'Tier board styling is included in the offline shell');
 }finally{await app.close();}
});
