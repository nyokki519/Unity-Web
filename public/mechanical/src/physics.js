import RAPIER from '../../vendor/rapier/rapier.mjs';
import {ballMass} from './config.js';
import {v} from './math.js';
import {mechanismPose,magneticForce} from './mechanisms.js';
let ready;
export async function initPhysics(){if(!ready)ready=RAPIER.init();await ready;}
export class MachinePhysics{
 constructor(config,geometry,onContact=()=>{}){
  this.config=config;this.geometry=geometry;this.balls=new Map();this.parts=new Map();this.movers=[];this.onContact=onContact;
  this.world=new RAPIER.World(v(0,-config.physics.gravity,-config.physics.gravity*config.physics.backTilt));this.world.timestep=config.physics.dt;
  this.world.integrationParameters.lengthUnit=1;this.world.integrationParameters.normalizedAllowedLinearError=.00002;this.world.integrationParameters.normalizedPredictionDistance=.0001;this.world.numSolverIterations=8;this.world.maxCcdSubsteps=4;this.events=new RAPIER.EventQueue(true);
  for(const shape of geometry.parts){const desc=shape.body==='kinematic'?RAPIER.RigidBodyDesc.kinematicPositionBased():RAPIER.RigidBodyDesc.fixed();desc.setTranslation(shape.position.x,shape.position.y,shape.position.z).setRotation(shape.rotation);
   const body=this.world.createRigidBody(desc);let cd;
   if(shape.kind==='box')cd=RAPIER.ColliderDesc.cuboid(...shape.size.map(n=>n/2));
   else if(shape.kind==='cylinder')cd=RAPIER.ColliderDesc.cylinder(shape.size.height/2,shape.size.radius);
   else if(shape.kind==='sphere')cd=RAPIER.ColliderDesc.ball(shape.size.radius);
   else cd=RAPIER.ColliderDesc.trimesh(new Float32Array(shape.vertices),new Uint32Array(shape.indices));
   const mat=config.materials[shape.role==='pin'?'pin':'resin'];cd.setFriction(shape.role==='rotor'?config.rotor.friction:shape.role==='rail'?.04:mat.friction).setRestitution(shape.role==='rail'?.12:mat.restitution);
   const collider=this.world.createCollider(cd,body);collider.userData={part:shape.id};this.parts.set(shape.id,{shape,body,collider});if(shape.mechanism)this.movers.push({shape,body});
  }
  this.updateMechanisms(0,{wing:0,attacker:false},true);
 }
 updateMechanisms(time,state,initial=false){for(const {shape,body}of this.movers){const pose=mechanismPose(shape.mechanism,time,state,this.config);if(initial){body.setTranslation(pose.position,true);body.setRotation(pose.rotation,true);}else{body.setNextKinematicTranslation(pose.position);body.setNextKinematicRotation(pose.rotation);}}}
 spawn(id,position,velocity,ticket=null){const c=this.config;
  const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setLinvel(velocity.x,velocity.y,velocity.z).setCcdEnabled(true).setLinearDamping(.012).setAngularDamping(c.ball.rollingDamping).setCanSleep(true));
  const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(c.ball.radius).setMass(ballMass(c.ball.radius,c.ball.density)).setFriction(c.ball.friction).setRestitution(c.ball.restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
  const ball={id,body,collider,previous:{...position},age:0,still:0,ticket,route:null,pickup:false};collider.userData={ball:id};this.balls.set(id,ball);return ball;
 }
 step(time,state){
  const dt=this.config.physics.dt,a=mechanismPose('bat',time,state,this.config),b=mechanismPose('bat',time+dt,state,this.config);
  const qa=a.rotation,qb=b.rotation,dot=Math.abs(qa.x*qb.x+qa.y*qb.y+qa.z*qb.z+qa.w*qb.w),angle=2*Math.acos(Math.min(1,dot));
  const sweep=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)+.05*angle;
  const steps=Math.max(1,Math.ceil(sweep/(this.config.ball.radius*.5)));if(steps>8)throw new Error('可動部の掃引が設定範囲を超えました');this.lastSubsteps=steps;
  for(const ball of this.balls.values())ball.previous={...ball.body.translation()};
  this.world.timestep=dt/steps;
  for(let i=0;i<steps;i++){
   const t=time+i*dt/steps;this.updateMechanisms(t+dt/steps,state);
   for(const ball of this.balls.values()){ball.body.resetForces(false);const f=magneticForce(ball.body.translation(),t,this.config);if(f.x||f.y||f.z)ball.body.addForce(f,true);}
   this.world.step(this.events);this.events.drainCollisionEvents((a,b,start)=>{if(start)this.onContact(a,b);});
  }
  this.world.timestep=dt;
  for(const ball of this.balls.values()){const p=ball.body.translation(),vel=ball.body.linvel();if(![p.x,p.y,p.z,vel.x,vel.y,vel.z].every(Number.isFinite))throw new Error('物理状態が有限ではありません');ball.age+=dt;ball.still=Math.hypot(vel.x,vel.y,vel.z)<.012?ball.still+dt:0;}
 }
 remove(id){const ball=this.balls.get(id);if(!ball)return false;this.world.removeRigidBody(ball.body);this.balls.delete(id);return true;}
 dispose(){this.balls.clear();this.parts.clear();this.events.free();this.world.free();}
}
export function crossingDown(ball,plane){const a=ball.previous,b=ball.body.translation();if(a.y<plane||b.y>=plane||a.y===b.y)return null;const t=(a.y-plane)/(a.y-b.y);return v(a.x+(b.x-a.x)*t,plane,a.z+(b.z-a.z)*t);}
