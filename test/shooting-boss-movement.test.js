import test from 'node:test';
import assert from 'node:assert/strict';
import {bossPosition,Game} from '../public/shooting/core.js';

test('each route has a deterministic bounded boss movement signature',()=>{
 const poses=Array.from({length:6},(_,stage)=>bossPosition(stage,8,false));
 assert.equal(new Set(poses.map(p=>`${p.x.toFixed(3)}:${p.y.toFixed(3)}`)).size,6);
 assert.ok(poses.every(({x,y})=>x>=100&&x<=380&&y>=105&&y<=155));
 assert.deepEqual(bossPosition(0,8),{x:240+Math.sin(8*.46)*65,y:135});
});

test('route boss poses remain inside the arena and move continuously for a full encounter',()=>{
 for(let stage=0;stage<6;stage++){
  let previous=bossPosition(stage,0);
  for(let frame=1;frame<=145*120;frame++){
   const pose=bossPosition(stage,frame/120);
   assert.ok(pose.x>=90&&pose.x<=390&&pose.y>=108&&pose.y<=162,`stage ${stage}, t=${frame/120}: ${JSON.stringify(pose)}`);
   assert.ok(Math.hypot(pose.x-previous.x,pose.y-previous.y)<1,`stage ${stage}, t=${frame/120}: jump ${JSON.stringify(pose)}`);
   previous=pose;
  }
 }
});

test('boss motion is independent of rendered frame timing',()=>{
 const a=new Game({seed:'boss-motion'}),b=new Game({seed:'boss-motion'});a.spawnEnemy(11,240,-85,true);b.spawnEnemy(11,240,-85,true);
 for(let i=0;i<1200;i++){a.update(1/120,{fire:false});b.update(1/120,{fire:false});}
 assert.deepEqual(a.boss,{...b.boss});
});

test('boss route motion starts after entry and stays smooth in the live movement update',()=>{
 const step=1/120;
 for(let stage=1;stage<6;stage++){
  const game=new Game({seed:`boss-entry-${stage}`});game.stage=stage;game.player.invincible=1e6;
  const boss=game.spawnEnemy(11,240,-70,true);let previousY=boss.y;
  for(let frame=0;frame<700;frame++){
   game.moveEnemies(step);
   assert.ok(Math.abs(boss.y-previousY)<1,`stage ${stage}, frame ${frame}: ${previousY} -> ${boss.y}`);
   previousY=boss.y;
  }
  assert.equal(boss.entered,true,`stage ${stage} never finished entry`);
  assert.equal(boss.motionBlend,1,`stage ${stage} never completed the motion blend`);
  assert.ok(Math.abs(boss.y-bossPosition(stage,boss.age).y)<1e-8,`stage ${stage} live pose diverged`);
 }
});
