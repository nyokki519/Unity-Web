import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.js';
test('retired mechanical files stay on disk but cannot be played via direct or normalized URLs',async()=>{
 const app=createApp({database:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 try{
  for(const path of ['/mechanical/index.html','/mechanical/src/main.js','/mechanical/','/%6dechanical/index.html','/assets/../mechanical/index.html']){
   const r=await fetch(base+path);assert.equal(r.status,410,path);assert.match(await r.text(),/公開を停止/);
  }
  for(const path of ['/','/silver-ring/index.html','/api/health'])assert.equal((await fetch(base+path)).status,200,path);
 }finally{await app.close();}
});
