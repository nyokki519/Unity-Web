import RAPIER from '../../vendor/rapier/rapier.mjs';
import {dieMesh,bowlMesh,bowlWallIndices,meshVolume,topFace,BOWL,rotate} from './dice-geometry.js';
import {bowlMotion} from './bowl-motion.js';
let ready;
export const PHYSICS={dt:1/240,gravity:9.80665,density:8000,friction:.28,bowlFriction:.32,restitution:.38,bowlRestitution:.35,linearDamping:.02,angularDamping:.06,maxSeconds:12,stableSeconds:.45,linearThreshold:.012,angularThreshold:.6,launchHeight:.04,launchSpeed:.35,predictionDistance:.002,bowlMotionSeconds:4.5,bowlMotionVariation:.6,bowlOrbit:.012,bowlFrequency:2.6,bowlTilt:.06,bowlHeave:.030,bowlHeaveFrequency:4.5};
export function seeded(seed){let x=seed>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);x=(x^(x>>>16))>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function orientation(rng){const a=rng(),b=2*Math.PI*rng(),c=2*Math.PI*rng();return {x:Math.sqrt(1-a)*Math.sin(b),y:Math.sqrt(1-a)*Math.cos(b),z:Math.sqrt(a)*Math.sin(c),w:Math.sqrt(a)*Math.cos(c)};}
export class DiceWorld{
 static async create(seed,options={}){ready??=RAPIER.init();await ready;return new DiceWorld(seed,options);}
 constructor(seed,{config={}}={}){
  this.config={...PHYSICS,...config};const c=this.config,rng=seeded(seed);this.seed=seed;this.tick=0;this.stable=0;this.done=false;this.result=null;this.contacts={floor:0,wall:0,dice:0};this.dieGeometry=dieMesh();this.bowlGeometry=bowlMesh();
  this.world=new RAPIER.World({x:0,y:-c.gravity,z:0});this.world.timestep=c.dt;this.world.integrationParameters.lengthUnit=1;this.world.integrationParameters.normalizedAllowedLinearError=.00001;this.world.integrationParameters.normalizedPredictionDistance=c.predictionDistance;this.world.numSolverIterations=12;this.world.maxCcdSubsteps=4;
  this.events=new RAPIER.EventQueue(true);this.soundEvents=[];
  const hand=seeded((seed^0x7a4d39e1)>>>0);
  this.gesture={seconds:c.bowlMotionSeconds>0?c.bowlMotionSeconds+(hand()-.5)*c.bowlMotionVariation:0,delay:.3,ramp:.6,brake:.9,radius:c.bowlOrbit,frequency:c.bowlFrequency,tilt:c.bowlTilt,direction:hand()<.5?-1:1,heave:c.bowlHeave,heaveFrequency:c.bowlHeaveFrequency};
  this.bowlBody=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  this.previousBowl={p:{x:0,y:0,z:0},q:{x:0,y:0,z:0,w:1}};
  this.bowl=this.world.createCollider(RAPIER.ColliderDesc.cylinder(BOWL.thickness/2,BOWL.flatRadius).setTranslation(0,-BOWL.thickness/2,0).setFriction(c.bowlFriction).setRestitution(c.bowlRestitution),this.bowlBody);
  this.bowlWall=this.world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(this.bowlGeometry.vertices),new Uint32Array(bowlWallIndices(this.bowlGeometry))).setFriction(c.bowlFriction).setRestitution(c.bowlRestitution),this.bowlBody);
  this.bowlHandles=new Set([this.bowl.handle,this.bowlWall.handle]);
  this.mass=meshVolume(this.dieGeometry)*c.density;
  this.dice=Array.from({length:3},(_,i)=>{
   const q=orientation(rng),p={x:-.033+i*.03,y:c.launchHeight+rng()*.015,z:-.045+(rng()-.5)*.012};
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setRotation(q).setLinvel((rng()-.5)*.6,.08+rng()*.12,c.launchSpeed+rng()*.25).setAngvel({x:(rng()-.5)*80,y:(rng()-.5)*80,z:(rng()-.5)*80}).setCcdEnabled(true).setCanSleep(false).setLinearDamping(c.linearDamping).setAngularDamping(c.angularDamping));
   const cd=RAPIER.ColliderDesc.convexMesh(new Float32Array(this.dieGeometry.vertices),new Uint32Array(this.dieGeometry.indices));if(!cd)throw new Error('サイコロの凸形状を作成できません');
   const collider=this.world.createCollider(cd.setMass(this.mass).setFriction(c.friction).setRestitution(c.restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS|RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(.005),body);return {body,collider,previous:{p:{...p},q:{...q}}};
  });
 }
 poses(){return this.dice.map(d=>({p:{...d.body.translation()},q:{...d.body.rotation()}}));}
 bowlLocal(p){const b=this.bowlBody.translation(),q=this.bowlBody.rotation();return rotate({x:-q.x,y:-q.y,z:-q.z,w:q.w},[p.x-b.x,p.y-b.y,p.z-b.z]);}
 drainSounds(){const events=this.soundEvents;this.soundEvents=[];return events;}
 collectSounds(){
  const velocity=(d,p)=>{const b=d?d.before:this.bowlBefore,r={x:p.x-b.p.x,y:p.y-b.p.y,z:p.z-b.p.z};return {x:b.v.x+b.w.y*r.z-b.w.z*r.y,y:b.v.y+b.w.z*r.x-b.w.x*r.z,z:b.v.z+b.w.x*r.y-b.w.y*r.x};};
  this.events.drainContactForceEvents(event=>{
   const a=this.dice.find(d=>d.collider.handle===event.collider1()),other=this.dice.find(d=>d.collider.handle===event.collider2()),first=a||other;if(!first)return;const second=a?other:null;
   const opposing=second?second.collider:this.world.getCollider(a?event.collider2():event.collider1());
   let point=null,closest=Infinity,points=0;
   this.world.contactPair(first.collider,opposing,(m,flipped)=>{
    points+=m.numContacts();for(let k=0;k<m.numContacts();k++){const dist=m.contactDist(k);if(dist>=closest)continue;const local=m.localContactPoint1(k);if(!local)continue;const owner=flipped?opposing:first.collider;
     const q=owner.rotation(),v=rotate(q,[local.x,local.y,local.z]),p=owner.translation();point={x:p.x+v[0],y:p.y+v[1],z:p.z+v[2]};closest=dist;
    }
   });
   if(!point){const p=first.body.translation();point={x:p.x,y:p.y-.008,z:p.z};}
   const n=event.maxForceDirection(),length=Math.hypot(n.x,n.y,n.z);if(length<1e-8)return;const normal={x:n.x/length,y:n.y/length,z:n.z/length},av=velocity(first,point),bv=velocity(second,point),v={x:av.x-bv.x,y:av.y-bv.y,z:av.z-bv.z},dot=v.x*normal.x+v.y*normal.y+v.z*normal.z,local=this.bowlLocal(point),radial=Math.hypot(local[0],local[2])/.135,id=this.dice.indexOf(first),otherId=second?this.dice.indexOf(second):-1,pair=second?'d'+[id,otherId].sort().join(''):'b'+id;
   this.soundEvents.push({touching:true,pair,id,type:second?'dice':radial>BOWL.flatRadius/.135?'rim':'bowl',normalSpeed:Math.abs(dot),tangentSpeed:Math.sqrt(Math.max(0,v.x*v.x+v.y*v.y+v.z*v.z-dot*dot)),angularSpeed:Math.max(Math.hypot(...Object.values(first.before.w)),second?Math.hypot(...Object.values(second.before.w)):0),impulse:event.totalForceMagnitude()*this.config.dt,mass:second?this.mass/2:this.mass,radial,points,time:this.tick*this.config.dt});
  });
  if(this.soundEvents.length>512)this.soundEvents.splice(0,this.soundEvents.length-512);
 }
 hasStack(){
  for(let i=0;i<this.dice.length;i++)for(let j=i+1;j<this.dice.length;j++){
   const a=this.dice[i],b=this.dice[j];if(Math.abs(a.body.translation().y-b.body.translation().y)<.008)continue;
   let supported=false;this.world.contactPair(a.collider,b.collider,m=>{if(Math.abs(m.normal().y)<.5)return;for(let k=0;k<m.numContacts();k++)if(m.contactDist(k)<.0002)supported=true;});if(supported)return true;
  }return false;
 }
 step(){
  if(this.done)return;const c=this.config;
  this.previousBowl={p:{...this.bowlBody.translation()},q:{...this.bowlBody.rotation()}};
  const next=bowlMotion((this.tick+1)*c.dt,this.gesture);
  this.bowlBody.setNextKinematicTranslation(next.p);this.bowlBody.setNextKinematicRotation(next.q);
  for(const d of this.dice){d.previous={p:{...d.body.translation()},q:{...d.body.rotation()}};d.before={p:{...d.body.translation()},v:{...d.body.linvel()},w:{...d.body.angvel()}};}
  this.world.step(this.events);this.tick++;
  this.bowlBefore={p:this.previousBowl.p,v:{...this.bowlBody.linvel()},w:{...this.bowlBody.angvel()}};
  this.events.drainCollisionEvents((a,b,start)=>{if(!start)return;if(this.bowlHandles.has(a)||this.bowlHandles.has(b)){const d=this.dice.find(d=>d.collider.handle===(this.bowlHandles.has(a)?b:a)),p=this.bowlLocal(d.body.translation());this.contacts[Math.hypot(p[0],p[2])>BOWL.flatRadius?'wall':'floor']++;}else this.contacts.dice++;});
  this.collectSounds();
  let quiet=Math.hypot(...Object.values(this.bowlBody.linvel()))<=.002&&Math.hypot(...Object.values(this.bowlBody.angvel()))<=.02;
  for(const d of this.dice){const p=d.body.translation(),v=d.body.linvel(),w=d.body.angvel(),local=this.bowlLocal(p);if(!Object.values(p).every(Number.isFinite))throw new Error('物理状態が不正です');if(local[1]<-.015||Math.hypot(local[0],local[2])>.17){this.finish(null,'場外に出ました');return;}if(Math.hypot(v.x,v.y,v.z)>c.linearThreshold||Math.hypot(w.x,w.y,w.z)>c.angularThreshold)quiet=false;}
  this.stable=quiet?this.stable+c.dt:0;
  if(this.stable>=c.stableSeconds){const faces=this.dice.map(d=>topFace(d.body.rotation()));if(faces.some(f=>!f)||this.hasStack())this.finish(null,'斜め停止・重なりのため振り直し');else this.finish(faces.map(f=>f.value));}
  else if(this.tick*c.dt>=c.maxSeconds)this.finish(null,'まだ止まらないため振り直し');
 }
 finish(values,reason=null){this.done=true;this.result={values,reason,seed:this.seed,ticks:this.tick,seconds:this.tick*this.config.dt,contacts:{...this.contacts}};}
 dispose(){this.events.free();this.world.free();}
}
