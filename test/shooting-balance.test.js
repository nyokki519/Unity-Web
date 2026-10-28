import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../public/shooting/core.js';
import {shootPlayer} from '../public/shooting/combat.js';
function salvo(weapon,width=0,full=false){const g=new Game({weapon});Object.assign(g.player,{width,supportCD:1e6,auxCD:1e6});if(full)Object.assign(g.player,{level:8,rapid:5,caliber:3,ricochet:3,orbitLevel:3});shootPlayer(g,1/120);return g;}
function sum(g,kind){let total=0;for(let i=0;i<g.bullets.capacity;i++)if(g.bullets.active[i]&&g.bullets.kind[i]===kind)total+=g.bullets.damage[i];return total;}
test('six visible main lanes share the original five-lane power budget',()=>{const g=salvo(0,3,true);assert.equal([...g.bullets.active].filter((a,i)=>a&&g.bullets.kind[i]===0).length,6);assert.ok(Math.abs(sum(g,0)-5*8*1.77)<.001);});
test('rapid weapon widening redistributes the salvo rather than multiplying damage',()=>{const a=salvo(1),b=salvo(1,3);assert.ok(b.bullets.count>a.bullets.count);assert.ok(Math.abs(sum(a,1)-sum(b,1))<.001);});
test('supplemental guns have bounded total DPS even at max visual count',()=>{for(let level=1;level<=3;level++){const g=new Game();Object.assign(g.player,{ricochet:level,orbitLevel:level});shootPlayer(g,1/120);assert.ok(sum(g,21)/g.player.ricochetCD<=20.001);assert.ok(sum(g,22)/g.player.orbitCD<=24.001);}});
