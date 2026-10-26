import test from 'node:test';
import assert from 'node:assert/strict';
const moduleUrl='../public/chinchiro/src/game.js';
test('all 216 dice combinations produce permutation-invariant ranked roles',async()=>{
 const {evaluate}=await import(moduleUrl);const counts={};
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  const r=evaluate([a,b,c]);assert.deepEqual(r,evaluate([c,a,b]));counts[r.kind]=(counts[r.kind]||0)+1;
 }
 assert.deepEqual(counts,{pin:1,point:90,hifumi:6,none:108,triple:5,shigoro:6});
});
test('settlements are zero-sum, ties push and hifumi doubles a normal loss',async()=>{
 const {evaluate,settlement}=await import(moduleUrl);
 assert.equal(settlement(evaluate([1,1,1]),evaluate([6,6,6]),10),50);
 assert.equal(settlement(evaluate([1,2,3]),evaluate([2,2,6]),10),-20);
 assert.equal(settlement(evaluate([2,2,6]),evaluate([1,1,6]),10),0);
 assert.throws(()=>evaluate([0,1,2]));assert.throws(()=>settlement(evaluate([1,1,1]),evaluate([6,6,6]),-1));
});
test('four-hand CPU match rotates dealer, limits rerolls and credits each hand once',async()=>{
 const {Match}=await import(moduleUrl);let n=0;const faces=[1,2,4,1,1,1,6,6,6];
 const m=new Match({die:()=>faces[n++%faces.length]});
 for(let h=0;h<4;h++){
  assert.equal(m.dealer,h%2);m.placeBet(10);assert.throws(()=>m.placeBet(10));
  let rolls=0;while(m.phase==='TURN'){
   if(m.locked){const bank=m.players.map(p=>p.coins);m.advance();if(m.phase==='ROUND_END'){assert.equal(m.players.reduce((s,p)=>s+p.coins,0),2000);const copy=m.players.map(p=>p.coins);assert.throws(()=>m.advance());assert.deepEqual(copy,m.players.map(p=>p.coins));}else assert.deepEqual(bank,m.players.map(p=>p.coins));}
   else{m.roll();rolls++;assert.ok(rolls<=6);}
  }
  assert.equal(m.phase,'ROUND_END');m.next();if(m.phase==='BET')assert.deepEqual(m.results,[null,null]);
 }
 assert.equal(m.phase,'FINAL');assert.equal(m.history.length,4);assert.throws(()=>m.next());
});
test('no-role can roll only three times and maximum loss never exceeds either bank',async()=>{
 const {Match}=await import(moduleUrl);let n=0;const m=new Match({die:()=>[1,2,4][n++%3]});
 assert.equal(m.maxBet,100);assert.throws(()=>m.placeBet(101));m.placeBet(100);
 for(let i=0;i<3;i++)m.roll();assert.equal(m.locked,true);assert.equal(m.attempt,3);assert.throws(()=>m.roll());m.advance();for(let i=0;i<3;i++)m.roll();m.advance();assert.equal(m.last.delta,0);
});
test('shonben ends the hand immediately for human and CPU, before or after opponent rolls',async()=>{
 const {Match}=await import(moduleUrl);
 for(const hand of [0,1])for(const turn of [0,1]){
  const m=new Match();m.hand=hand;m.placeBet(25);
  if(turn){m.roll([1,1,1]);m.advance();}
  const loser=m.current;m.forfeitOutside();
  assert.equal(m.phase,'ROUND_END');assert.equal(m.results[loser].kind,'shonben');
  assert.equal(m.results[loser].label,'ションベン');assert.equal(m.results[loser].attempt,1);
  assert.equal(m.last.delta,loser===0?-25:25);
  assert.equal(m.players.reduce((s,p)=>s+p.coins,0),2000);
  assert.equal(m.history.length,1);assert.throws(()=>m.finishHand());assert.throws(()=>m.forfeitOutside());assert.throws(()=>m.roll());
  m.next();assert.equal(m.phase,'BET');assert.deepEqual(m.results,[null,null]);
 }
});
test('outside after a no-role retry counts the throw and cannot replace a locked role',async()=>{
 const {Match}=await import(moduleUrl);const m=new Match();m.placeBet(10);m.roll([1,2,4]);m.forfeitOutside();
 assert.equal(m.results[0].attempt,2);assert.equal(m.last.delta,-10);
 const locked=new Match();locked.placeBet(10);locked.roll([1,1,1]);assert.throws(()=>locked.forfeitOutside());
});
