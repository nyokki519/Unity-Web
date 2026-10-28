import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../public/shooting/core.js';
import {pickupFeedback,abilityStatus,ITEM_UI} from '../public/shooting/feedback.js';

test('pickup reports actual before/after values, including capped recovery',()=>{
 const g=new Game();g.player.hp=2;g.collect('H');
 let event=g.drainEvents().find(e=>e.type==='item');
 assert.equal(event.applied,'H');assert.equal(event.before.hp,2);assert.equal(event.after.hp,3);
 g.player.hp=g.player.maxHp;g.collect('H');event=g.drainEvents().find(e=>e.type==='item');
 assert.equal(event.before.hp,event.after.hp);
});
test('mystery pickups disclose resolved effect and preserve the original identity',()=>{
 const g=new Game({seed:'feedback'});g.collect('?');const event=g.drainEvents().find(e=>e.type==='item');
 assert.equal(event.value,'?');assert.ok(['P','S','W','H','E','G','B'].includes(event.applied));
 assert.ok(event.before&&event.after);
});
test('batched pickups retain independent snapshots rather than the final state',()=>{
 const g=new Game();g.collect('P');g.collect('P');const events=g.drainEvents().filter(e=>e.type==='item');
 assert.equal(events[0].before.level,1);assert.equal(events[0].after.level,2);
 assert.equal(events[1].before.level,2);assert.equal(events[1].after.level,3);
});

test('first firepower pickup retains its eleven percentage point gain',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');
 const damage=boost=>{const g=new Game({weapon:0});if(boost)g.collect('P');shootPlayer(g,1/120);return g.bullets.damage.find((_,i)=>g.bullets.active[i]&&g.bullets.kind[i]===0);};
 assert.ok(Math.abs(damage(true)/damage(false)-1.11)<1e-6);
});
test('rapid pickup gives a modest eight to thirteen percent sustained rate gain',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');
 const count=boost=>{const g=new Game();if(boost)g.collect('S');for(let i=0;i<1200;i++)shootPlayer(g,1/120);return g.stats.shots;};
 assert.ok(count(true)>=count(false)*1.08);assert.ok(count(true)<=count(false)*1.13);
});
test('width supplies visibly add firepower for all twenty weapon types',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');
 for(let weapon=0;weapon<20;weapon++){
  const a=new Game({weapon}),b=new Game({weapon});b.collect('W');shootPlayer(a,1/120);shootPlayer(b,1/120);
  assert.ok(b.bullets.count>a.bullets.count,`weapon ${weapon} must gain visible shots`);
 }
});
test('first laser and missile supplements are meaningful attacks',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');
 for(const [id,kind] of [['L',4],['M',6]]){const g=new Game();g.collect(id);shootPlayer(g,1/120);let damage=0;for(let i=0;i<g.bullets.capacity;i++)if(g.bullets.active[i]&&g.bullets.kind[i]===kind)damage+=g.bullets.damage[i];assert.ok(damage>0);assert.ok(damage/g.player.auxCD<=(id==='L'?5:8)/1.2+.001,id+' respects original sustained damage');assert.ok(g.player.auxCD<=.7);}
});

test('feedback uses actual improvements and never claims healing at full health',()=>{
 const g=new Game();g.collect('P');let e=g.drainEvents().find(e=>e.type==='item');assert.match(pickupFeedback(e).detail,/100 → 111%/);
 g.collect('H');e=g.drainEvents().find(e=>e.type==='item');assert.match(pickupFeedback(e).detail,/全回復済み/);assert.doesNotMatch(pickupFeedback(e).detail,/→/);
 g.collect('?');e=g.drainEvents().find(e=>e.type==='item');assert.match(pickupFeedback(e).title,/未知核 →/);assert.ok(ITEM_UI[e.applied]);
});
test('ability readiness uses actual cost, cooldown and ongoing drive',()=>{
 const g=new Game({ship:6}),p=g.player;p.energy=49;p.bombs=0;p.drive=100;
 assert.equal(abilityStatus(g).special.ready,false);assert.equal(abilityStatus(g).bomb.ready,false);assert.equal(abilityStatus(g).overdrive.ready,true);
 p.energy=50;assert.equal(abilityStatus(g).special.ready,true);p.specialCD=2.1;assert.equal(abilityStatus(g).special.detail,'あと 3秒');
 p.driveTime=5;assert.equal(abilityStatus(g).overdrive.ready,false);
});

test('large-caliber supply increases real projectile radius without a multiplicative damage bonus',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');const a=new Game(),b=new Game();b.collect('A');shootPlayer(a,1/120);shootPlayer(b,1/120);
 const first=g=>[...g.bullets.active].findIndex((v,i)=>v&&g.bullets.kind[i]===0),i=first(a),j=first(b);
 assert.ok(b.bullets.r[j]>a.bullets.r[i]);assert.equal(b.bullets.damage[j],a.bullets.damage[i]);
});
test('ricochet supply emits real wall-reflecting supplemental projectiles',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js');const g=new Game();g.collect('Q');shootPlayer(g,1/120);
 const i=[...g.bullets.active].findIndex((v,i)=>v&&g.bullets.kind[i]===21);assert.ok(i>=0);assert.ok(g.bullets.bounces[i]>=2);
 g.bullets.x[i]=470;g.bullets.vx[i]=1000;g.bullets.vy[i]=-10;g.moveBullets(1/120);assert.ok(g.bullets.vx[i]<0);
});
test('orbital cannons fire from the same orbit geometry used by presentation',async()=>{
 const {shootPlayer}=await import('../public/shooting/combat.js'),{orbitPositions}=await import('../public/shooting/balance.js');const g=new Game();g.collect('T');shootPlayer(g,1/120);
 const points=orbitPositions(g.player,g.time);assert.equal(points.length,2);
 for(const pos of points){assert.ok([...g.bullets.active].some((v,i)=>v&&g.bullets.kind[i]===22&&Math.abs(g.bullets.x[i]-pos.x)<.01&&Math.abs(g.bullets.y[i]-pos.y)<.01));}
});
test('barrier supply prevents one hit and then is consumed',()=>{
 const g=new Game();g.collect('D');g.player.invincible=0;const hp=g.player.hp;g.hurt();assert.equal(g.player.hp,hp);assert.equal(g.player.shield,0);g.player.invincible=0;g.hurt();assert.equal(g.player.hp,hp-1);
});
test('new visual upgrades cap at three while barrier pickup reports existing protection',()=>{
 const g=new Game();for(let n=0;n<6;n++)for(const id of ['A','Q','T'])g.collect(id);
 assert.equal(g.player.caliber,3);assert.equal(g.player.ricochet,3);assert.equal(g.player.orbitLevel,3);
 const events=g.drainEvents();for(const id of ['A','Q','T'])assert.match(pickupFeedback(events.filter(e=>e.type==='item'&&e.value===id).at(-1)||{}).detail,/最大強化/);
 g.collect('D');g.collect('D');assert.match(pickupFeedback(g.drainEvents().filter(e=>e.type==='item').at(-1)).detail,/展開済み/);
});
test('late power and rapid feedback uses the actual diminishing gains',()=>{const g=new Game();g.player.level=7;g.collect('P');let e=g.drainEvents().find(e=>e.type==='item');assert.match(pickupFeedback(e).detail,/141 → 143%/);g.player.rapid=4;g.collect('S');e=g.drainEvents().find(e=>e.type==='item');assert.match(pickupFeedback(e).detail,/132 → 136%/);});
