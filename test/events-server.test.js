import {randomUUID} from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';import {WebSocket} from 'ws';import {createApp} from '../src/server.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){const start=Date.now();while(!fn()){if(Date.now()-start>5000)throw new Error('Event state did not converge');await sleep(10);}}
class Client{
 constructor(base,s){this.messages=[];this.state=null;this.ws=new WebSocket(base.replace('http','ws')+'/ws');this.ws.on('open',()=>this.ws.send(JSON.stringify({action:'auth',...s})));this.ws.on('message',raw=>{const m=JSON.parse(raw);this.messages.push(m);if(m.type==='state')this.state=m.state;});}
 send(action,data={}){const requestId=randomUUID();this.ws.send(JSON.stringify({requestId,action,roundId:this.state?.event?.roundId,revision:this.state?.event?.revision,...data}));return requestId;}
 async command(action,data={}){const requestId=this.send(action,data);await wait(()=>this.messages.some(m=>m.requestId===requestId&&(m.type==='ack'||m.type==='error')));const err=this.messages.find(m=>m.requestId===requestId&&m.type==='error');if(err)throw new Error(err.code);}
 error(code){return this.messages.some(m=>m.type==='error'&&m.code===code);}
}
for(const people of [6,15])test(`real HTTP/WebSocket ${people} participants: six events, privacy, reconnect, roles and late join`,async()=>{
 const app=createApp({database:':memory:',hostGraceMs:50});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`,clients=[],sessions=[];
 const post=async(path,data)=>{const res=await fetch(base+path,{method:'POST',body:JSON.stringify(data)});assert.equal(res.status,201);return res.json();};
 try{
  sessions.push(await post('/api/rooms',{name:'司会',settings:{eventGame:'VALUES',eventOptions:{roundLimit:2}}}));const code=sessions[0].code;
  for(let i=1;i<people;i++)sessions.push(await post(`/api/rooms/${code}/join`,{name:`参加者${i}`}));for(const s of sessions)clients.push(new Client(base,s));await wait(()=>clients.every(c=>c.state?.players.filter(p=>p.connected).length===people));
  await Promise.all(clients.map(c=>c.command('ready',{ready:true})));const host=clients[0];await host.command('start');await wait(()=>clients.every(c=>c.state.event?.phase==='RULES'));
  for(const game of ['VALUES','WHO','BOUNDARY','QUEST','CAFE','STORY']){
   if(game!=='VALUES')await host.command('event_switch',{gameId:game,options:{roundLimit:2}});
   for(let round=0;round<2;round++){
    await host.command('event_begin');await wait(()=>clients.every(c=>c.state.event?.phase===(['QUEST','CAFE'].includes(game)?'CONSULT':'ANSWER')));
    const internal=app.engine.get(code).event;
    clients[1].send('event_close');await wait(()=>clients[1].error('HOST_ONLY'));
    clients[1].send('event_answer',{roundId:'stale',value:50});await wait(()=>clients[1].error('STALE_ROUND'));
    if(['QUEST','CAFE'].includes(game)){
     for(const t of internal.teams){const c=clients.find(c=>c.state.selfId===t.captainId),value=game==='QUEST'?'共通点は朝の散歩':{name:`読書カフェ${t.name}`,concept:'静かな本の時間',selection:{location:'park',menu:'coffee',interior:'simple'}};
      if(game==='CAFE'){await c.command('event_cafe_draft',{value});const outsider=clients.find(c=>!t.memberIds.includes(c.state.selfId));assert.notEqual(outsider.state.event.team.draft?.name,value.name);const member=clients.find(c=>t.memberIds.includes(c.state.selfId)&&c.state.selfId!==t.captainId);await wait(()=>member.state.event.team.draft?.name===value.name);}
      await c.command('event_answer',{value});
     }
    }else{
     const q=host.state.event.question;const value=game==='VALUES'?q.choices.map(c=>c.id):game==='BOUNDARY'?30:game==='WHO'?'回答者を秘密にする短文':{title:'匿名の体験',text:'体験談'.repeat(200)};
     await clients[1].command('event_answer',{value});assert.equal(host.state.event.ownAnswer,null);assert.equal(host.state.event.result,null);assert.equal(host.state.event.moderation.length,0);assert.equal(host.state.event.answers,undefined);
     clients[1].send('event_answer',{value});await wait(()=>clients[1].error('ALREADY_ANSWERED'));
     for(let i=2;i<people-1;i++)await clients[i].command('event_answer',{skip:true});
    }
    const prior=host.state.event.revision;await host.command('event_close');host.send('event_reveal',{revision:prior});await wait(()=>host.error('STALE_STATE'));await host.command('event_reveal');
    if(['WHO','STORY'].includes(game)){
     const view=host.state.event;assert.equal(view.guess.solution,null);assert.equal(view.guess.item.ownerId,undefined);assert.ok(!JSON.stringify(view.guess.item).includes(sessions[1].playerId));
     clients[1].send('event_vote',{itemId:view.guess.item.id,value:sessions[1].playerId});await wait(()=>clients[1].error('SELF_VOTE'));await clients[2].command('event_vote',{itemId:view.guess.item.id,value:sessions[1].playerId});assert.equal(host.state.event.guess.ownVote,null);
     await host.command('event_close');assert.equal(host.state.event.guess.solution,null);await host.command('event_solution');assert.equal(host.state.event.guess.solution.id,sessions[1].playerId);await host.command('event_next_item');
    }
    await wait(()=>clients.every(c=>c.state.event.phase==='TALK'));if(game==='BOUNDARY')assert.deepEqual(host.state.event.result.positions,[30]);
    if(round===0&&game==='VALUES'){
     clients[1].ws.close();const restored=new Client(base,sessions[1]);clients[1]=restored;await wait(()=>restored.state?.event?.phase==='TALK');assert.ok(restored.state.event.ownAnswer.value);assert.equal(restored.state.selfId,sessions[1].playerId);
    }
    await host.command('event_next');await wait(()=>clients.every(c=>c.state.event.phase===(round?'FINAL':'RULES')));
   }
  }
  const late=await post(`/api/rooms/${code}/join`,{name:'途中参加'}),lc=new Client(base,late);clients.push(lc);await wait(()=>lc.state?.event?.phase==='FINAL');await host.command('event_switch',{gameId:'BOUNDARY'});await host.command('event_begin');await wait(()=>lc.state?.event?.phase==='ANSWER');assert.equal(lc.state.event.participating,false);await lc.command('ready',{ready:true});await host.command('event_close');await host.command('event_reveal');await host.command('event_next');await host.command('event_begin');await wait(()=>lc.state.event.participating);host.ws.close();await wait(()=>clients[1].state.hostId===sessions[1].playerId);
  const returned=new Client(base,sessions[0]);clients.push(returned);await wait(()=>returned.state?.event);returned.send('event_end');await wait(()=>returned.error('HOST_ONLY'));
  for(const c of clients)for(const m of c.messages){if(m.type==='state'){assert.equal(m.state.event?.answers,undefined);assert.ok(!JSON.stringify(m).includes('tokenHash'));for(const s of sessions)assert.ok(!JSON.stringify(m).includes(s.token));}}
 }finally{for(const c of clients)c.ws.close();await app.close();}
});
