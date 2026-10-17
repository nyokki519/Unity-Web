import test from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../public/silver-ring/src/recorded-sounds.js').catch(()=>({}));
function context(){const nodes=[];return{currentTime:0,state:'running',nodes,async decodeAudioData(bytes){return{role:new TextDecoder().decode(bytes)};},createBufferSource(){const n={connect(){},disconnect(){this.disconnected=true},start(){this.started=true},stop(){this.stopped=true}};nodes.push(n);return n;},createGain(){return{gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}};}
test('recorded clips decode once, route distinct roles and cap overlapping playback',async()=>{
 assert.equal(typeof mod.RecordedSounds,'function');let loads=0;const bank=new mod.RecordedSounds({fetcher:async url=>{loads++;return{ok:true,arrayBuffer:async()=>new TextEncoder().encode(url.includes('jackpot')?'jackpot':'breakthrough').buffer}}});const ctx=context();assert.equal(bank.play('breakthrough',ctx,{}),false);await Promise.all([bank.prepare(ctx),bank.prepare(ctx)]);assert.equal(loads,3);assert.equal(bank.status,'ready');
 bank.play('breakthrough',ctx,{});bank.play('jackpot',ctx,{});assert.equal(ctx.nodes[0].buffer.role,'breakthrough');assert.equal(ctx.nodes[1].buffer.role,'jackpot');
 for(let i=0;i<8;i++)bank.play('breakthrough',ctx,{});assert.equal(bank.active.breakthrough.size,4);assert.ok(ctx.nodes[0].stopped);
 bank.play('jackpot',ctx,{});assert.equal(bank.active.jackpot.size,1);assert.ok(ctx.nodes[1].stopped);
 for(const n of ctx.nodes)n.onended?.();assert.equal(bank.active.breakthrough.size,0);assert.equal(bank.active.jackpot.size,0);assert.ok(ctx.nodes.every(n=>n.disconnected));
});
test('missing clip can be retried without failing the game',async()=>{
 assert.equal(typeof mod.RecordedSounds,'function');let fail=true;const bank=new mod.RecordedSounds({fetcher:async()=>({ok:!fail,status:404,arrayBuffer:async()=>new ArrayBuffer(2)})});const ctx=context();assert.equal(await bank.prepare(ctx),false);assert.equal(bank.status,'error');assert.equal(bank.play('jackpot',ctx,{}),false);fail=false;assert.equal(await bank.prepare(ctx),true);assert.equal(bank.status,'ready');
});
test('whisper follows visibility without stacking and stops when hidden',async()=>{
 const bank=new mod.RecordedSounds({fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)})});const ctx=context();await bank.prepare(ctx);
 assert.equal(typeof bank.setWhisper,'function');bank.setWhisper(true,ctx,{});const first=ctx.nodes.at(-1);assert.equal(first.loop,true);bank.setWhisper(true,ctx,{});assert.equal(ctx.nodes.at(-1),first);bank.setWhisper(false,ctx,{});assert.ok(first.stopped);bank.setWhisper(true,ctx,{});assert.notEqual(ctx.nodes.at(-1),first);
});
