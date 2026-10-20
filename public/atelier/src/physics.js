import R from '../../vendor/rapier/rapier.mjs';
import {SETTINGS,holes,surfaceHeight,surfaceAt,seeded} from './config.js';
import {buildDish} from './geometry.js';
await R.init();
export class AtelierSim{
 constructor({seed=1701,onEvent=()=>{}}={}){
  this.onEvent=onEvent;this.seed=seed;this.random=seeded(seed);this.balls=new Map();this.results=[];this.remaining=SETTINGS.initialBalls;this.launched=0;this.time=0;this.id=0;
  this.world=new R.World({x:0,y:-9.81,z:0});this.world.timestep=SETTINGS.dt;this.world.numSolverIterations=8;
  this.dish=buildDish();
  this.world.createCollider(R.ColliderDesc.trimesh(this.dish.vertices,this.dish.indices,R.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(.22).setRestitution(.13));
  // Thin solid pipe walls avoid one-sided triangle seams at the opening.
  for(const hole of holes)for(let i=0;i<64;i++){
   const a=i/64*Math.PI*2,r=SETTINGS.holeRadius+.0008,x=hole.x+Math.cos(a)*r,z=hole.z+Math.sin(a)*r,top=surfaceAt(x,z);
   this.world.createCollider(R.ColliderDesc.cuboid(.0008,(top+.064)/2,Math.PI*r/64+.0001).setTranslation(x,(top-.064)/2,z).setRotation({x:0,y:Math.sin(-a/2),z:0,w:Math.cos(-a/2)}).setFriction(.15).setRestitution(.12));
  }
  for(let i=0;i<96;i++){
   const a=i/96*Math.PI*2,r=SETTINGS.radius+.002;
   this.world.createCollider(R.ColliderDesc.cuboid(.004,.027,Math.PI*r/96+.0003).setTranslation(Math.cos(a)*r,.087,Math.sin(a)*r).setRotation({x:0,y:Math.sin(-a/2),z:0,w:Math.cos(-a/2)}).setFriction(.12).setRestitution(.22));
  }
 }
 spawn(x,z,y,velocity={x:0,y:0,z:0}){
  const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,y,z).setLinvel(velocity.x,velocity.y,velocity.z).setCcdEnabled(true).setCanSleep(false).setLinearDamping(SETTINGS.linearDamping).setAngularDamping(SETTINGS.rollingAngularDamping));
  this.world.createCollider(R.ColliderDesc.ball(SETTINGS.ballRadius).setMass(SETTINGS.ballMass).setFriction(.19).setRestitution(.18),body);
  const ball={id:++this.id,body,born:this.time,resolved:false,previous:body.translation(),previousRotation:body.rotation()};this.balls.set(ball.id,ball);return ball;
 }
 launch(power=.5){
  if(this.remaining<=0||this.balls.size>=SETTINGS.maxLive)return null;
  // A busy feed port refuses a shot without spending a ball.
  const x=.158,z=.013;
  for(const ball of this.balls.values()){const p=ball.body.translation();if(Math.hypot(p.x-x,p.z-z)<SETTINGS.ballRadius*3&&p.y>.05)return null;}
  power=Math.max(0,Math.min(1,Number.isFinite(power)?power:.5));
  const v=.38+.36*power,jitter=(this.random()-.5)*.015;
  const ball=this.spawn(x,z,surfaceAt(x,z)+SETTINGS.ballRadius+.004,{x:-.055+jitter,y:0,z:v});
  ball.body.setAngvel({x:v/SETTINGS.ballRadius,y:0,z:.055/SETTINGS.ballRadius},true);
  this.remaining--;this.launched++;this.onEvent({type:'launch',id:ball.id});return ball;
 }
 // Controlled drops are for automated verification, not a hidden player advantage.
 drop(x,z){this.launched++;return this.spawn(x,z,surfaceAt(x,z)+.028);}
 resolve(ball,hole,reason){
  if(ball.resolved)return;ball.resolved=true;
  const result={id:ball.id,hole:hole?.id??null,win:!!hole?.win,reason,time:this.time,dwell:this.time-ball.born};this.results.push(result);if(reason==='returned')this.remaining++;
  this.onEvent({type:'result',...result});
 }
 step(){
  this.time+=SETTINGS.dt;
  if(this.balls.size===0)return;
  for(const ball of this.balls.values()){ball.previous=ball.body.translation();ball.previousRotation=ball.body.rotation();ball.previousVelocity=ball.body.linvel();}
  this.world.step();
  for(const ball of this.balls.values()){
   const p=ball.body.translation(),v=ball.body.linvel(),before=ball.previousVelocity;
   const impulse=Math.hypot(v.x-before.x,v.y-before.y+9.81*SETTINGS.dt,v.z-before.z);
   if(impulse>.16&&this.time-(ball.lastImpact??-1)>.12){ball.lastImpact=this.time;this.onEvent({type:'impact',strength:Math.min(1,impulse)});}
   if(!ball.resolved){
    const hole=holes.find(h=>Math.hypot(p.x-h.x,p.z-h.z)<SETTINGS.holeRadius+.003&&p.y<surfaceAt(h.x,h.z)-.018);
    if(hole)this.resolve(ball,hole,'hole');
    else if(p.y<-.07||Math.hypot(p.x,p.z)>SETTINGS.radius+.05||this.time-ball.born>SETTINGS.maxBallAge){this.resolve(ball,null,'returned');this.onEvent({type:'return',id:ball.id});}
   }
   if(ball.resolved&&(p.y<-.11||this.results.find(r=>r.id===ball.id)?.reason==='returned')){this.world.removeRigidBody(ball.body);this.balls.delete(ball.id);}
  }
 }
 dispose(){this.world.free();this.balls.clear();}
}
