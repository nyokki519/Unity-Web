import test from 'node:test';import assert from 'node:assert/strict';import {WebSocket} from 'ws';import {createApp} from '../src/server.js';
const wait=async fn=>{const end=Date.now()+6000;while(!fn()){if(Date.now()>end)throw new Error('CPU state did not converge');await new Promise(r=>setTimeout(r,20));}};
test('HTTP/WebSocket CPU control enforces real host credentials and keeps automatic anonymous answers private',async()=>{
 const app=createApp({database:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`,clients=[];
 try{
  const post=async(path,data)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,201);return r.json();};
  const host=await post('/api/rooms',{name:'司会',settings:{eventGame:'WHO',eventOptions:{roundLimit:1,itemLimit:1}}}),guest=await post(`/api/rooms/${host.code}/join`,{name:'参加者'});
  for(const s of [host,guest]){
   const c={messages:[],state:null};c.ws=new WebSocket(base.replace('http','ws')+'/ws');c.ws.on('message',raw=>{const m=JSON.parse(raw);c.messages.push(m);if(m.type==='state')c.state=m.state;});c.ws.on('open',()=>c.ws.send(JSON.stringify({action:'auth',code:s.code,token:s.token})));c.send=(action,data={})=>c.ws.send(JSON.stringify({action,roundId:c.state?.event?.roundId,revision:c.state?.event?.revision,...data}));clients.push(c);
  }
  const [a,b]=clients;await wait(()=>a.state&&b.state);b.send('cpu_add',{total:15});await wait(()=>b.messages.some(m=>m.code==='HOST_ONLY'));assert.equal(a.state.players.length,2);
  a.send('cpu_add',{total:6});await wait(()=>a.state.players.length===6&&b.state.players.length===6);assert.equal(b.state.players.filter(p=>p.cpu).length,4);assert.ok(!JSON.stringify(b.state).includes('tokenHash'));
  a.send('ready',{ready:true});b.send('ready',{ready:true});await wait(()=>a.state.players.every(p=>p.ready));a.send('start');await wait(()=>a.state.event?.phase==='RULES');a.send('event_begin');await wait(()=>a.state.event.answeredCount===4);assert.equal(a.state.event.ownAnswer,null);assert.equal(a.state.event.answers,undefined);assert.equal(a.state.event.result,null);assert.equal(a.state.event.guess,null);
  b.send('event_answer',{skip:true});a.send('event_answer',{skip:true});await wait(()=>a.state.event.answeredCount===6);a.send('event_close');await wait(()=>a.state.event.phase==='CLOSED');a.send('event_reveal');await wait(()=>a.state.event.phase==='GUESS');assert.equal(b.state.event.guess.solution,null);assert.ok(b.state.event.guess.item.text.includes('CPUテスト回答'));await wait(()=>a.state.event.guess.voteCount===3);
  a.send('event_close');await wait(()=>a.state.event.phase==='GUESS_CLOSED');a.send('event_solution');await wait(()=>a.state.event.phase==='SOLUTION');assert.ok(a.state.event.guess.solution.name.startsWith('CPU '));a.send('event_next_item');await wait(()=>a.state.event.phase==='TALK');a.send('event_next');await wait(()=>a.state.phase==='FINAL');
 }finally{for(const c of clients)c.ws.close();await app.close();}
});
