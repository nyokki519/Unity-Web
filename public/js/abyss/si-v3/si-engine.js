import R from '../../../vendor/rapier/rapier.mjs';
import{createBoard,gateAt,FIXED_DT,BALL_RADIUS,BALL_MASS,PHYSICS_VERSION,PX_PER_METER}from'./si-config.js';
import{bowlHeight}from'./si-geometry.js';
await R.init();
export function createSimulation({difficulty='easy',seed='abyss',initialBalls=100,config={},debug=false}={}){
 const board=createBoard(difficulty,config),world=new R.World({x:0,y:-board.gravity,z:0}),queue=new R.EventQueue(true),meta=new Map(),bodies=new Map(),balls=[],events=[],inputs=[],traces=[],successRoutes=[];
 world.timestep=FIXED_DT;world.integrationParameters.lengthUnit=.05;world.integrationParameters.numSolverIterations=6;world.integrationParameters.maxCcdSubsteps=8;
 let disposed=false,accumulator=0,nextId=0,nextEvent=0,lastFire=-Infinity,rng=2166136261;
 for(const c of String(seed))rng=Math.imul(rng^c.codePointAt(0),16777619)>>>0;
 const random=()=>{rng=(rng+0x6d2b79f5)>>>0;let n=rng;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
 const reserve=Number.isFinite(Number(initialBalls))?Math.min(1000000,Math.max(0,Math.floor(Number(initialBalls)))):100;
 const stats={shots:0,boardReached:0,forestAttempts:0,forestPasses:0,gateReached:0,gateAttempts:0,gatePasses:0,trayEntries:[0,0,0],trayPasses:[0,0,0],trayMisses:[0,0,0],trayTimeouts:[0,0,0],dwellTotals:[0,0,0,0,0],dwellCounts:[0,0,0,0,0],contacts:{pin:0,wall:0,ball:0,gate:0,rim:0},heatmap:Array(640).fill(0),stalled:Array(640).fill(0),heatmapCols:20,heatmapRows:32,pinHits:Array(board.pins.length).fill(0),outflow:Array(20).fill(0),angleBins:{},powerBins:{},speedSum:0,speedSamples:0};
 const g={physicsVersion:PHYSICS_VERSION,board,balls,events,inputs,traces,successRoutes,stats,difficulty:board.difficulty,seed:String(seed),config:structuredClone(config),initialBalls:reserve,remaining:reserve,fired:0,lost:0,jackpots:0,score:0,passes:[0,0,0],tick:0,elapsed:0,status:reserve?'running':'finished',endReason:reserve?null:'empty',debugUsed:false,inputsTruncated:false,gatePose:gateAt(board.gate,0),fire,step,pause(){if(g.status==='running')g.status='paused';},resume(){if(g.status==='paused'&&!disposed)g.status='running';},end,debugDrop,debugEmpty(){if(!debug||disposed)return false;g.debugUsed=true;g.remaining=0;finishIfEmpty();return true;},debugSetBall,inspectBall(id){const body=bodies.get(id);return body?{position:{...body.translation()},velocity:{...body.linvel()},angularVelocity:{...body.angvel()},mass:body.mass()}:null;},snapshot,dispose(){if(disposed)return;disposed=true;queue.free();world.free();bodies.clear();meta.clear();},debugContacts(id){if(!debug||disposed)return[];const b=balls.find(b=>b.id===id);if(!b)return[];const c=world.getCollider(b.collider),result=[];world.contactPairsWith(c,other=>world.contactPair(c,other,(m,flipped)=>result.push({part:meta.get(other.handle)?.partId,normal:m.normal(),flipped,contacts:m.numSolverContacts(),points:Array.from({length:m.numSolverContacts()},(_,i)=>({point:m.solverContactPoint(i),dist:m.solverContactDist(i)}))})));return result;},get disposed(){return disposed;}};
 let gateBody;
 for(const part of board.parts){let desc;if(part.kind==='box'){const a=part.halfExtents;desc=R.ColliderDesc.cuboid(a.x,a.y,a.z);}else if(part.kind==='capsule')desc=R.ColliderDesc.capsule(part.halfHeight,part.radius);else if(part.kind==='cylinder')desc=R.ColliderDesc.cylinder(part.halfHeight,part.radius);else desc=R.ColliderDesc.trimesh(part.vertices,part.indices,R.TriMeshFlags.FIX_INTERNAL_EDGES_TWO_SIDED);
  desc.setFriction(part.friction??(part.tag==='rail'?.015:board.friction)).setRestitution(part.restitution??(part.tag==='pin'?board.restitution:part.tag==='rail'?0:.12)).setFrictionCombineRule(R.CoefficientCombineRule.Min).setContactSkin(.00003);
  if(part.tag==='pin')desc.setRestitutionCombineRule(R.CoefficientCombineRule.Max);
  let parent;
  if(part.tag==='gate'){gateBody=parent=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(part.position.x,part.position.y,part.position.z));}
  else desc.setTranslation(part.position.x,part.position.y,part.position.z);
  desc.setRotation(part.rotation);const collider=world.createCollider(desc,parent);meta.set(collider.handle,{tag:part.tag,pinId:part.pinId,partId:part.id});
 }
 function emit(type,b,extra={}){events.push({id:++nextEvent,type,stage:b?.stage||0,at:g.elapsed,...(b?{ballId:b.id,x:b.renderX,y:b.renderY,z:b.renderZ}:{}),...extra});if(events.length>512)events.splice(0,events.length-512);}
 function record(input){if(inputs.length<1000000)inputs.push(input);else g.inputsTruncated=true;}
 function spawn(position,velocity,zone='rail',stage=0){
  if(disposed||g.status!=='running'||!g.remaining||balls.length>=board.maxBalls)return false;
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setLinvel(velocity.x,velocity.y,velocity.z).setCcdEnabled(true).setLinearDamping(.008).setAngularDamping(.12).setCanSleep(false));
  const collider=world.createCollider(R.ColliderDesc.ball(BALL_RADIUS).setMass(BALL_MASS).setFriction(board.friction).setRestitution(.08).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),body);
  const b={id:++nextId,zone,stage,r:BALL_RADIUS,x:position.x,y:position.y,z:position.z,vx:velocity.x,vy:velocity.y,vz:velocity.z,age:0,stageAge:0,rotation:{x:0,y:0,z:0,w:1},collider:collider.handle,previous:{...position}};
  bodies.set(b.id,body);meta.set(collider.handle,{tag:'ball',id:b.id});balls.push(b);g.remaining--;g.fired++;stats.shots++;stats.dwellCounts[stage||0]++;traces.push({id:b.id,points:[]});if(traces.length>32)traces.shift();sync(b);emit('fire',b);return b;
 }
 function fire(power=55,angle=-90){
  if(disposed||g.status!=='running'||g.elapsed-lastFire<board.fireInterval-1e-9)return false;
  power=Number.isFinite(Number(power))?Math.min(100,Math.max(1,Number(power))):55;
  const a=debug&&Number.isFinite(Number(angle))?Math.min(-80,Math.max(-100,Number(angle))):-90,speed=(1.8+5.2*Math.sqrt(power/100))*(1+board.launchVariance*(random()*2-1));
  if(a!==-90)g.debugUsed=true;
  const b=spawn(board.launcher,{x:Math.cos(a*Math.PI/180)*speed,y:-Math.sin(a*Math.PI/180)*speed,z:0});if(!b)return false;
  lastFire=g.elapsed;b.angleBin=String(Math.floor(a/5)*5);b.powerBin=String(Math.floor(power/10)*10);for(const[key,bin]of[['angleBins',b.angleBin],['powerBins',b.powerBin]]){stats[key][bin]??={shots:0,jackpots:0,lost:0};stats[key][bin].shots++;}record({tick:g.tick,type:'fire',power,angle:a});return true;
 }
 function sync(b){const body=bodies.get(b.id);if(!body)return;const p=body.translation(),v=body.linvel();Object.assign(b,{x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,rotation:{...body.rotation()},renderX:p.x*PX_PER_METER,renderY:(board.height-p.y)*PX_PER_METER,renderZ:p.z*PX_PER_METER});}
 function retire(b,win,reason='lost'){
  if(!bodies.has(b.id))return;
  const body=bodies.get(b.id);meta.delete(b.collider);world.removeRigidBody(body);bodies.delete(b.id);balls.splice(balls.indexOf(b),1);
  const route=traces.find(t=>t.id===b.id);if(win){g.jackpots++;g.score+=10000;if(route){successRoutes.push(structuredClone(route));if(successRoutes.length>10)successRoutes.shift();}emit('jackpot',b);}else{g.lost++;stats.outflow[Math.max(0,Math.min(19,Math.floor(b.x/board.width*20)))]++;emit(reason,b);}
  for(const[key,bin]of[['angleBins',b.angleBin],['powerBins',b.powerBin]])if(bin&&stats[key][bin])stats[key][bin][win?'jackpots':'lost']++;
  const index=traces.findIndex(t=>t.id===b.id);if(index>=0)traces.splice(index,1);
 }
 function finishIfEmpty(){if(!g.remaining&&!balls.length&&g.status==='running'){g.status='finished';g.endReason='empty';emit('finish');}}
 function end(){if(disposed||g.status==='finished')return;record({tick:g.tick,type:'end'});for(const b of [...balls])retire(b,false);g.status='finished';g.endReason='quit';emit('quit');}
 function metadataStep(b){
  b.age+=FIXED_DT;b.stageAge+=FIXED_DT;
  if(b.zone==='rail'&&b.x<.12&&b.y>.6){b.zone='board';stats.boardReached++;emit('board-enter',b);}
  if(b.zone==='board'&&!b.forestChecked&&b.y<board.entry.y&&b.previous.y>=board.entry.y){b.forestChecked=true;stats.forestAttempts++;
   if(Math.abs(b.x-board.entry.x)<board.entry.width/2-BALL_RADIUS){stats.forestPasses++;stats.gateReached++;b.zone='gate';emit('entry',b);}else b.zone='out';}
  if(b.zone==='gate'&&b.y<board.gate.y-.009){if(Math.abs(b.x-board.gate.x)<board.gate.width/2-BALL_RADIUS&&b.z<.04){b.zone='transfer';b.stageAge=0;stats.gatePasses++;emit('gate-pass',b);}else b.zone='out';}
  if(b.zone==='transfer'){
   const next=board.trays[b.stage];
   if(next&&Math.hypot(b.x-next.cx,b.z-next.cz)<next.radius+BALL_RADIUS&&b.y<next.cy+.022&&b.y>next.cy-next.depth-.018){b.stage++;b.zone='tray';b.stageAge=0;stats.trayEntries[b.stage-1]++;stats.dwellCounts[b.stage]++;emit('tray-enter',b);}
  }
  if(b.zone==='tray'){
   const t=board.trays[b.stage-1];let cleared=null;
   for(const h of t.holes){const plane=bowlHeight(t,h.x,h.z)-BALL_RADIUS-.002;if(b.y<plane&&b.previous.y>=plane&&b.vy<0){const fraction=(b.previous.y-plane)/(b.previous.y-b.y||1),x=b.previous.x+(b.x-b.previous.x)*fraction,z=b.previous.z+(b.z-b.previous.z)*fraction;if(Math.hypot(x-t.cx-h.x,z-t.cz-h.z)<h.r+.001){cleared=h;break;}}}
   if(cleared){if(cleared.win){stats.trayPasses[b.stage-1]++;g.passes[b.stage-1]++;emit('hole-win',b);if(b.stage===3){retire(b,true);return;}b.zone='transfer';b.stageAge=0;}else{stats.trayMisses[b.stage-1]++;b.zone='out';b.collectBelow=b.y-.022;b.stageAge=0;emit('hole-miss',b);}}
   else if(b.y<t.cy-t.depth-.035||Math.hypot(b.x-t.cx,b.z-t.cz)>t.radius+.04&&b.y<t.cy-.005){stats.trayMisses[b.stage-1]++;b.zone='out';b.stageAge=0;emit('spill',b);}
   else if(b.stageAge>35){stats.trayTimeouts[b.stage-1]++;retire(b,false,'timeout');return;}
  }
  if(b.zone==='out'&&board.trays.some(t=>{const plane=t.cy-t.depth-.024;return b.previous.y>=plane&&b.y<plane&&Math.hypot(b.x-t.cx,b.z-t.cz)<t.radius+.025;})){retire(b,false,'collected');return;}
  if(b.zone==='out'&&Number.isFinite(b.collectBelow)&&b.y<b.collectBelow){retire(b,false,'collected');return;}
  if(![b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite)){retire(b,false,'invalid-state');return;}
  if(b.y<-.055||b.age>60||Math.abs(b.x)>.9||Math.abs(b.z)>.7){retire(b,false,b.age>60?'timeout':'lost');return;}
  const idx=Math.max(0,Math.min(639,Math.floor((board.height-b.y)/board.height*32)*20+Math.floor(b.x/board.width*20))),speed=Math.hypot(b.vx,b.vy,b.vz);
  stats.heatmap[idx]++;if(speed<.015)stats.stalled[idx]++;stats.speedSum+=speed;stats.speedSamples++;
  const dwell=['transfer','out'].includes(b.zone)?4:b.stage;stats.dwellTotals[dwell]+=FIXED_DT;
  if(g.tick%12===0){const route=traces.find(t=>t.id===b.id);if(route){route.points.push({tick:g.tick,x:b.x,y:b.y,z:b.z,stage:b.stage,zone:b.zone});if(route.points.length>500)route.points.shift();}}
 }
 function step(seconds=FIXED_DT){if(disposed||g.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return;accumulator+=Math.min(seconds,60);
  while(accumulator+1e-12>=FIXED_DT&&g.status==='running'){
   accumulator-=FIXED_DT;g.gatePose=gateAt(board.gate,(g.tick+1)*FIXED_DT);gateBody.setNextKinematicTranslation(g.gatePose.position);
   for(const b of balls){b.previous={x:b.x,y:b.y,z:b.z};bodies.get(b.id).enableCcd(Math.hypot(b.vx,b.vy,b.vz)*FIXED_DT>BALL_RADIUS*.45);}
   world.step(queue);g.tick++;g.elapsed=g.tick*FIXED_DT;
   queue.drainCollisionEvents((a,c,started)=>{if(!started)return;const ma=meta.get(a),mc=meta.get(c);if(!ma||!mc)return;const ball=ma.tag==='ball'?ma:mc.tag==='ball'?mc:null,other=ball===ma?mc:ma,b=ball&&balls.find(b=>b.id===ball.id);if(!b)return;const type=other.tag==='pin'?'pin':other.tag==='ball'?'ball':other.tag==='gate'?'gate':other.tag==='rim'?'rim':'wall';stats.contacts[type]++;if(type==='pin')stats.pinHits[other.pinId]++;if(type==='gate')stats.gateAttempts++;emit(type==='ball'?'ball-contact':type==='gate'?'gate-block':type,b,{energyJ:.5*BALL_MASS*(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz),energyUnit:'J',partId:other.partId});});
   for(const b of [...balls]){sync(b);metadataStep(b);}finishIfEmpty();
  }
 }
 function debugDrop(stage,{outcome='natural'}={}){
  if(!debug||!Number.isInteger(stage)||stage<0||stage>3||!['natural','win','miss'].includes(outcome))return false;g.debugUsed=true;
  if(!stage){const b=spawn({x:board.entry.x,y:.37,z:.007},{x:0,y:-.3,z:0},'gate',0);if(b){stats.gateReached++;stats.forestPasses++;}return b;}
  const t=board.trays[stage-1],h=t.holes.find(h=>h.win===(outcome==='win')),natural=outcome==='natural',x=natural?-t.radius*.84:h.x,z=natural?-t.radius*.15:h.z;
  const b=spawn({x:t.cx+x,y:bowlHeight(t,x,z)+BALL_RADIUS+.012,z:t.cz+z},natural?{x:.035,y:0,z:.25}:{x:0,y:-.12,z:0},'tray',stage);
  if(b){stats.trayEntries[stage-1]++;b.stageAge=0;}return b;
 }
 function debugSetBall(id,{position,velocity,angularVelocity}={}){if(!debug||disposed)return false;const body=bodies.get(id),b=balls.find(b=>b.id===id);if(!body||!b)return false;for(const v of[position,velocity,angularVelocity])if(v&&![v.x,v.y,v.z].every(Number.isFinite))return false;g.debugUsed=true;if(position)body.setTranslation(position,true);if(velocity)body.setLinvel(velocity,true);if(angularVelocity)body.setAngvel(angularVelocity,true);sync(b);b.previous={x:b.x,y:b.y,z:b.z};return true;}
 function snapshot(){return structuredClone({physicsVersion:g.physicsVersion,seed:g.seed,difficulty:g.difficulty,config:g.config,initialBalls:g.initialBalls,status:g.status,endReason:g.endReason,tick:g.tick,elapsed:g.elapsed,remaining:g.remaining,fired:g.fired,lost:g.lost,jackpots:g.jackpots,score:g.score,passes:g.passes,balls:balls.map(({collider,previous,...b})=>b),stats,inputs,traces,successRoutes});}
 return g;
}
