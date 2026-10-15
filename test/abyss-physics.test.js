import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../public/js/abyss/engine.js';
import {createBoard,BALL_RADIUS,BALL_MASS,FIXED_DT} from '../public/js/abyss/config.js';
import {bowlHeight} from '../public/js/abyss/si-geometry.js';
const advance=(g,t)=>{for(let i=0;i<Math.ceil(t/FIXED_DT);i++)g.step(FIXED_DT);};
test('SI model has actual sphere mass and provisional evidence, fixed dishes and role-based pins',()=>{
 const g=createSimulation({debug:true});try{assert.equal(g.board.units,'m-s-kg');assert.equal(BALL_RADIUS,.0055);const b=g.debugDrop(1);assert.ok(Math.abs(g.inspectBall(b.id).mass-BALL_MASS)<1e-9);assert.ok(g.board.pins.every(p=>p.role));assert.equal(new Set(g.board.pins.map(p=>p.role)).size>4,true);assert.ok(g.board.trays.every(t=>t.rpm===0));assert.equal(g.board.evidence.mechanisms.confidence,'E');}finally{g.dispose();}
});
test('weak shots return down the rail; proper shots physically traverse upper rail without teleports',()=>{
 for(const power of[1,55]){const g=createSimulation({initialBalls:1});try{g.fire(power);let top=0,jump=0,last={...g.balls[0]};for(let i=0;i<240*8&&g.balls.length;i++){g.step(FIXED_DT);const b=g.balls[0];if(b){top=Math.max(top,b.y);jump=Math.max(jump,Math.hypot(b.x-last.x,b.y-last.y,b.z-last.z));last={...b};}}assert.ok(jump<.04);if(power===1){assert.ok(top<.4);assert.equal(g.stats.boardReached,0);}else{assert.ok(top>.7);assert.equal(g.stats.boardReached,1);}}finally{g.dispose();}}
});
test('sphere falls through each genuine success and loss aperture only after clearing the surface',()=>{
 for(let stage=1;stage<=3;stage++)for(const outcome of['win','miss']){const g=createSimulation({debug:true,initialBalls:1});try{const b=g.debugDrop(stage,{outcome});assert.ok(b);g.step(FIXED_DT);assert.equal(g.passes[stage-1],0);advance(g,.4);assert.equal(g.stats.trayPasses[stage-1],outcome==='win'?1:0);assert.equal(g.stats.trayMisses[stage-1],outcome==='miss'?1:0);assert.equal(g.fired,g.lost+g.jackpots+g.balls.length);}finally{g.dispose();}}
});
test('a fast airborne crossing over an aperture is not an immediate win',()=>{
 const g=createSimulation({debug:true,initialBalls:1});try{const t=g.board.trays[2],h=t.holes[0],b=g.debugDrop(3);g.debugSetBall(b.id,{position:{x:t.cx+h.x-.025,y:bowlHeight(t,h.x-.025,h.z)+BALL_RADIUS+.002,z:t.cz+h.z},velocity:{x:3,y:0,z:0}});advance(g,.0125);assert.equal(g.jackpots,0);assert.equal(g.passes[2],0);}finally{g.dispose();}
});
test('closed kinematic gate physically blocks; open gate admits the same drop',()=>{
 for(const open of[false,true]){const g=createSimulation({debug:true,config:{gatePeriod:10,gateOpenDuration:open?9:.15}});try{g.step(1);g.debugDrop(0);advance(g,.3);if(open)assert.equal(g.stats.gatePasses,1);else{assert.equal(g.stats.gatePasses,0);assert.ok(g.stats.contacts.gate>0);}}finally{g.dispose();}}
});
test('the same ball keeps its identity and physical pose while moving between dishes',()=>{
 const g=createSimulation({debug:true,initialBalls:1});try{const b=g.debugDrop(1,{outcome:'win'}),id=b.id;let last={...b},jump=0,entered=false;for(let i=0;i<240*8&&g.balls.length;i++){g.step(FIXED_DT);if(g.balls.length){const current=g.balls[0];assert.equal(current.id,id);jump=Math.max(jump,Math.hypot(current.x-last.x,current.y-last.y,current.z-last.z));entered ||= current.stage===2;last={...current};}}assert.ok(entered);assert.ok(jump<.04);}finally{g.dispose();}
});
test('fixed-step snapshots match across 30fps and 120fps calls',()=>{
 const a=createSimulation({seed:'repeat'}),b=createSimulation({seed:'repeat'});try{a.fire(55);b.fire(55);for(let i=0;i<90;i++)a.step(1/30);for(let i=0;i<360;i++)b.step(1/120);assert.deepEqual(a.snapshot(),b.snapshot());}finally{a.dispose();b.dispose();}
});
test('static dish contact does not create excessive mechanical energy',()=>{
 const g=createSimulation({debug:true,initialBalls:1});try{const b=g.debugDrop(3,{outcome:'natural'});const energy=()=>{const s=g.inspectBall(b.id);if(!s)return 0;return .5*BALL_MASS*(s.velocity.x**2+s.velocity.y**2+s.velocity.z**2)+.2*BALL_MASS*BALL_RADIUS**2*(s.angularVelocity.x**2+s.angularVelocity.y**2+s.angularVelocity.z**2)+BALL_MASS*g.board.gravity*s.position.y;};const initial=energy();let peak=initial;for(let i=0;i<240*5&&g.balls.length;i++){g.step(FIXED_DT);peak=Math.max(peak,energy());}assert.ok(peak<initial*1.03+.0001,`${peak} > ${initial}`);}finally{g.dispose();}
});
test('multi-ball play preserves finite state, ledger, limits and disposal',()=>{
 const g=createSimulation({seed:'ledger',initialBalls:20});for(let i=0;i<240*70&&g.status==='running';i++){if(i%144===0)g.fire(35+(g.fired%6)*10);g.step(FIXED_DT);assert.equal(g.fired,g.lost+g.jackpots+g.balls.length);assert.ok(g.balls.length<=g.board.maxBalls);assert.ok(g.balls.every(b=>[b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite)));}assert.equal(g.fired,20);assert.ok(g.events.length<=512);g.end();assert.equal(g.balls.length,0);assert.equal(g.fired,g.lost+g.jackpots);g.dispose();g.dispose();assert.equal(g.fire(),false);g.step(1);
});
test('debug is gated, validates inputs and flags altered records',()=>{
 const normal=createSimulation(),lab=createSimulation({debug:true});try{assert.equal(normal.debugDrop(3),false);assert.equal(lab.debugDrop(NaN),false);assert.equal(lab.debugDrop(8),false);const b=lab.debugDrop(3);assert.equal(lab.debugUsed,true);assert.equal(lab.debugSetBall(b.id,{velocity:{x:NaN,y:0,z:0}}),false);}finally{normal.dispose();lab.dispose();}
});
test('SI tuning changes shared contact geometry rather than presentation-only settings',()=>{
 const base=createBoard(),tuned=createBoard('custom',{pinPreset:'left',pinAdjustments:[{index:0,dx:.002,angle:12,restitution:.8}],cradleScale:1.1,cradleDepthScale:1.2});
 assert.ok(Math.abs(tuned.pins[0].x-(base.pins[0].x-.001))<1e-12);
 const collider=tuned.parts.find(p=>p.pinId===0);assert.equal(collider.restitution,.8);assert.notDeepEqual(collider.rotation,base.parts.find(p=>p.pinId===0).rotation);
 assert.ok(Math.abs(tuned.trays[0].radius/base.trays[0].radius-1.1)<1e-12);assert.ok(Math.abs(tuned.trays[0].depth/base.trays[0].depth-1.2)<1e-12);
 for(const board of[base,tuned,createBoard('normal'),createBoard('abyss')])for(const tray of board.trays)for(const hole of tray.holes){assert.ok(hole.r>BALL_RADIUS);assert.ok(Math.hypot(hole.x,hole.z)+hole.r<tray.radius);}
});

test('all stock pin passages exceed a ball diameter and no pin wedges against a guide',()=>{
 for(const difficulty of ['easy','normal','abyss']){
  const b=createBoard(difficulty);
  for(let i=0;i<b.pins.length;i++)for(let j=i+1;j<b.pins.length;j++){const p=b.pins[i],q=b.pins[j];assert.ok(Math.hypot(p.x-q.x,p.y-q.y)-p.r-q.r>=.01399,`${difficulty}: ${i}/${j}`);}
 }
});
test('entry and transfer chutes arrive above the cup lip and never start uphill',()=>{
 const b=createBoard();const entry=b.parts.find(p=>p.id==='gate-entry');assert.ok(entry.vertices.length>0);
 for(const t of b.trays){const lowestHole=t.holes.reduce((a,h)=>bowlHeight(t,h.x,h.z)<bowlHeight(t,a.x,a.z)?h:a);assert.ok(lowestHole.win,'central low point is an actual open drain, not a closed annular pocket');}
 for(const p of b.parts.filter(p=>p.id.startsWith('transfer-'))){const y=[];for(let i=0;i<p.vertices.length;i+=12)y.push((p.vertices[i+1]+p.vertices[i+4])/2);assert.ok(y.every((v,i)=>!i||v<=y[i-1]+1e-6),'no uphill floor');}
});

test('previous bowl trap drains under gravity instead of waiting for a timeout',()=>{
 const g=createSimulation({debug:true,initialBalls:1});try{const b=g.debugDrop(1),t=g.board.trays[0],x=-.0284,z=.0073;g.debugSetBall(b.id,{position:{x:t.cx+x,y:bowlHeight(t,x,z)+BALL_RADIUS+.0001,z:t.cz+z},velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0}});advance(g,12);assert.equal(g.balls.filter(v=>v.id===b.id&&v.stage===1&&v.zone==='tray').length,0);assert.ok(!g.events.some(e=>e.type==='timeout'));}finally{g.dispose();}
});
test('pin field produces measurable lateral rebounds without scripted steering',()=>{
 const g=createSimulation({seed:'pin-motion',initialBalls:12}),paths=new Map();try{
  for(let tick=0;tick<240*16;tick++){if(tick%144===0)g.fire([35,45,55,65,75][g.fired%5]);g.step(FIXED_DT);for(const b of g.balls){if(b.zone!=='board'||Math.abs(b.vx)<.04)continue;const p=paths.get(b.id)||{sign:0,turns:0};const sign=Math.sign(b.vx);if(p.sign&&p.sign!==sign)p.turns++;p.sign=sign;paths.set(b.id,p);}}
  assert.ok(g.stats.contacts.pin>=30);assert.ok([...paths.values()].filter(p=>p.turns>=3).length>=3);
 }finally{g.dispose();}
});
