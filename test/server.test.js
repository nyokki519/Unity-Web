import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createApp} from '../src/server.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(predicate){const start=Date.now();while(!predicate()){if(Date.now()-start>3000)throw new Error('State did not converge');await sleep(15);}}
class Client{
 constructor(url,session){this.messages=[];this.state=null;this.ws=new WebSocket(url);this.ws.on('message',raw=>{const m=JSON.parse(raw);this.messages.push(m);if(m.type==='state')this.state=m.state;});this.ws.on('open',()=>this.ws.send(JSON.stringify({action:'auth',code:session.code,token:session.token})));}
 send(action,data={}){this.ws.send(JSON.stringify({action,...data}));}
 error(code){return this.messages.some(m=>m.type==='error'&&m.code===code);}
}
test('real HTTP + WebSocket: private answers, multiple rounds, reload, QR and final',async()=>{
 const app=createApp({database:':memory:',countdownMs:30,hostGraceMs:100});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 try{
  const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,201);return r.json();};
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/js/app.js')).headers.get('content-type'),'text/javascript');
  assert.equal((await fetch(base+'/api/rooms/0000/join',{method:'POST',body:JSON.stringify({name:'X'})})).status,404);
  const host=await post('/api/rooms',{name:'同じ名前',settings:{mode:'ALIGN',depth:'LIGHT',rounds:3,autoReveal:false}}),guest=await post(`/api/rooms/${host.code}/join`,{name:'同じ名前'});
  const qr=await fetch(base+`/api/qr?room=${host.code}`);assert.equal(qr.status,200);assert.ok((await qr.text()).includes('<svg'));
  const a=new Client(base.replace('http','ws')+'/ws',host),b=new Client(base.replace('http','ws')+'/ws',guest);await wait(()=>a.state?.players.length===2&&b.state);assert.equal(b.state.players.find(p=>p.id===guest.playerId).name,'同じ名前 · 2');
  a.send('ready',{ready:true});b.send('ready',{ready:true});await wait(()=>a.state.players.every(p=>p.ready));a.send('start');await wait(()=>a.state.phase==='ANSWER'&&b.state.phase==='ANSWER');
  a.send('reveal');await wait(()=>a.error('WAIT_ANSWERS'));b.send('answer',{roundId:b.state.round.id,value:'b'});await wait(()=>a.state.round.answeredCount===1);assert.equal(a.state.round.ownAnswer,null);assert.equal(a.state.round.result,null);assert.ok(!a.messages.some(m=>m.state?.round?.answers));
  b.ws.close();await wait(()=>!a.state.players.find(p=>p.id===guest.playerId).connected);let restored=new Client(base.replace('http','ws')+'/ws',guest);await wait(()=>restored.state?.round?.ownAnswer?.value==='b');assert.equal(restored.state.selfId,guest.playerId);
  a.send('answer',{roundId:a.state.round.id,value:'a'});await wait(()=>a.state.round.answeredCount===2);assert.equal(a.state.phase,'ANSWER');a.send('reveal');await wait(()=>a.state.phase==='TALK');assert.deepEqual(a.state.round.result.counts,[1,1]);
  for(let i=0;i<2;i++){a.send('next');await wait(()=>a.state.phase==='ANSWER'&&restored.state.phase==='ANSWER');a.send('answer',{roundId:a.state.round.id,value:'a'});restored.send('answer',{roundId:restored.state.round.id,value:'b'});await wait(()=>a.state.round.answeredCount===2);a.send('reveal');await wait(()=>a.state.phase==='TALK');}
  a.send('next');await wait(()=>a.state.phase==='FINAL'&&restored.state.phase==='FINAL');assert.equal(a.state.summary.questions,3);assert.equal(a.state.summary.people,2);assert.notDeepEqual(a.state.summary.own.values,restored.state.summary.own.values);
  let duplicateCloseCode;restored.ws.on('close',code=>{duplicateCloseCode=code;});const duplicate=new Client(base.replace('http','ws')+'/ws',guest);await wait(()=>duplicate.state?.phase==='FINAL'&&duplicateCloseCode===4001);assert.equal(duplicate.state.selfId,guest.playerId);assert.equal(duplicate.state.players.length,2);restored=duplicate;
  a.send('again');await wait(()=>a.state.phase==='LOBBY');assert.ok(a.state.players.every(p=>!p.ready));a.ws.close();await wait(()=>restored.state.hostId===guest.playerId);restored.ws.close();
 }finally{await app.close();}
});
test('ten independent players synchronize LINE without exposing private identities in the result',async()=>{
 const app=createApp({database:':memory:',countdownMs:30});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`,clients=[];
 try{
  const post=async(path,data)=>(await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).json();
  const host=await post('/api/rooms',{name:'HOST',settings:{mode:'LINE',rounds:1}});const sessions=[host,...await Promise.all(Array.from({length:9},(_,i)=>post(`/api/rooms/${host.code}/join`,{name:`参加者${i+1}`})))];
  for(const s of sessions)clients.push(new Client(base.replace('http','ws')+'/ws',s));await wait(()=>clients.every(c=>c.state?.players.filter(p=>p.connected).length===10));
  clients.forEach(c=>c.send('ready',{ready:true}));await wait(()=>clients[0].state.players.every(p=>p.ready));clients[0].send('start');await wait(()=>clients.every(c=>c.state.phase==='ANSWER'));
  const scale=clients[0].state.round.question.scale;const inputs=Array.from({length:10},(_,i)=>scale?Number((scale.min+Math.round((scale.max-scale.min)/scale.step*i/9)*scale.step).toPrecision(15)):i*10);
  for(let i=0;i<9;i++)clients[i].send('answer',{roundId:clients[i].state.round.id,value:inputs[i]});await wait(()=>clients[9].state.round.answeredCount===9);assert.equal(clients[9].state.round.result,null);assert.equal(clients[9].state.round.ownAnswer,null);
  clients[9].send('answer',{roundId:clients[9].state.round.id,value:inputs[9]});await wait(()=>clients.every(c=>c.state.phase==='TALK'));const mean=inputs.reduce((a,b)=>a+b,0)/inputs.length;assert.equal(clients[0].state.round.result.average,scale?Number(mean.toFixed(10)):Math.round(mean));assert.deepEqual(clients[0].state.round.result.positions,inputs);
  const publicResult=JSON.stringify(clients[0].state.round.result);for(const s of sessions)assert.ok(!publicResult.includes(s.playerId));
  clients[0].send('next');await wait(()=>clients.every(c=>c.state.phase==='FINAL'));assert.equal(clients[0].state.summary.people,10);
 }finally{for(const c of clients)c.ws.close();await app.close();}
});
test('free hosting metadata and Render external HTTPS origin are used without exposing credentials',async()=>{
 const oldUrl=process.env.RENDER_EXTERNAL_URL,oldPublic=process.env.PUBLIC_URL,oldEphemeral=process.env.EPHEMERAL_STORAGE;
 process.env.RENDER_EXTERNAL_URL='https://deployment-test.example';delete process.env.PUBLIC_URL;process.env.EPHEMERAL_STORAGE='true';
 const app=createApp({database:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 try{
  const catalog=await(await fetch(base+'/api/catalog')).json();assert.equal(catalog.hosting.ephemeral,true);assert.equal(catalog.apiKey,undefined);
  const session=await(await fetch(base+'/api/rooms',{method:'POST',body:JSON.stringify({name:'QR検証'})})).json();
  const actual=await(await fetch(base+`/api/qr?room=${session.code}`)).text();const QRCode=(await import('qrcode')).default;
  const expected=await QRCode.toString(`https://deployment-test.example/?room=${session.code}`,{type:'svg',margin:2,errorCorrectionLevel:'M',color:{dark:'#383d30',light:'#fcfaf6'}});assert.equal(actual,expected);
 }finally{await app.close();for(const[k,v]of Object.entries({RENDER_EXTERNAL_URL:oldUrl,PUBLIC_URL:oldPublic,EPHEMERAL_STORAGE:oldEphemeral}))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
