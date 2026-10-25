import RAPIER from '../../vendor/rapier/rapier.mjs';
import {dieMesh,bowlMesh,meshVolume,topFace,BOWL} from './dice-geometry.js';
let ready;
export const PHYSICS={dt:1/240,gravity:9.80665,density:1180,friction:.28,bowlFriction:.32,restitution:.38,bowlRestitution:.35,linearDamping:.02,angularDamping:.06,maxSeconds:8,stableSeconds:.45,linearThreshold:.012,angularThreshold:.6,launchHeight:.04,launchSpeed:.35};
export function seeded(seed){let x=seed>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);x=(x^(x>>>16))>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function orientation(rng){const a=rng(),b=2*Math.PI*rng(),c=2*Math.PI*rng();return {x:Math.sqrt(1-a)*Math.sin(b),y:Math.sqrt(1-a)*Math.cos(b),z:Math.sqrt(a)*Math.sin(c),w:Math.sqrt(a)*Math.cos(c)};}
export class DiceWorld{
 static async create(seed,options={}){ready??=RAPIER.init();await ready;return new DiceWorld(seed,options);}
 constructor(seed,{config={}}={}){
  this.config={...PHYSICS,...config};const c=this.config,rng=seeded(seed);this.seed=seed;this.tick=0;this.stable=0;this.done=false;this.result=null;this.contacts={floor:0,wall:0,dice:0};this.dieGeometry=dieMesh();this.bowlGeometry=bowlMesh();
  this.world=new RAPIER.World({x:0,y:-c.gravity,z:0});this.world.timestep=c.dt;this.world.integrationParameters.lengthUnit=1;this.world.integrationParameters.normalizedAllowedLinearError=.00001;this.world.integrationParameters.normalizedPredictionDistance=.0001;this.world.numSolverIterations=12;this.world.maxCcdSubsteps=4;
  this.events=new RAPIER.EventQueue(true);
  this.bowl=this.world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(this.bowlGeometry.vertices),new Uint32Array(this.bowlGeometry.indices)).setFriction(c.bowlFriction).setRestitution(c.bowlRestitution));
  this.mass=meshVolume(this.dieGeometry)*c.density;
  this.dice=Array.from({length:3},(_,i)=>{
   const q=orientation(rng),p={x:-.033+i*.03,y:c.launchHeight+rng()*.015,z:-.045+(rng()-.5)*.012};
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setRotation(q).setLinvel((rng()-.5)*.6,.08+rng()*.12,c.launchSpeed+rng()*.25).setAngvel({x:(rng()-.5)*80,y:(rng()-.5)*80,z:(rng()-.5)*80}).setCcdEnabled(true).setCanSleep(false).setLinearDamping(c.linearDamping).setAngularDamping(c.angularDamping));
   const cd=RAPIER.ColliderDesc.convexMesh(new Float32Array(this.dieGeometry.vertices),new Uint32Array(this.dieGeometry.indices));if(!cd)throw new Error('サイコロの凸形状を作成できません');
   const collider=this.world.createCollider(cd.setMass(this.mass).setFriction(c.friction).setRestitution(c.restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);return {body,collider,previous:{p:{...p},q:{...q}}};
  });
 }
 poses(){return this.dice.map(d=>({p:{...d.body.translation()},q:{...d.body.rotation()}}));}
 hasStack(){
  for(let i=0;i<this.dice.length;i++)for(let j=i+1;j<this.dice.length;j++){
   const a=this.dice[i],b=this.dice[j];if(Math.abs(a.body.translation().y-b.body.translation().y)<.008)continue;
   let supported=false;this.world.contactPair(a.collider,b.collider,m=>{if(Math.abs(m.normal().y)<.5)return;for(let k=0;k<m.numContacts();k++)if(m.contactDist(k)<.0002)supported=true;});if(supported)return true;
  }return false;
 }
 step(){
  if(this.done)return;const c=this.config;
  for(const d of this.dice)d.previous={p:{...d.body.translation()},q:{...d.body.rotation()}};
  this.world.step(this.events);this.tick++;
  this.events.drainCollisionEvents((a,b,start)=>{if(!start)return;if(a===this.bowl.handle||b===this.bowl.handle){const d=this.dice.find(d=>d.collider.handle===(a===this.bowl.handle?b:a)),p=d.body.translation();this.contacts[Math.hypot(p.x,p.z)>BOWL.flatRadius?'wall':'floor']++;}else this.contacts.dice++;});
  let quiet=true;
  for(const d of this.dice){const p=d.body.translation(),v=d.body.linvel(),w=d.body.angvel();if(!Object.values(p).every(Number.isFinite))throw new Error('物理状態が不正です');if(p.y<-.015||Math.hypot(p.x,p.z)>.17){this.finish(null,'場外に出ました');return;}if(Math.hypot(v.x,v.y,v.z)>c.linearThreshold||Math.hypot(w.x,w.y,w.z)>c.angularThreshold)quiet=false;}
  this.stable=quiet?this.stable+c.dt:0;
  if(this.stable>=c.stableSeconds){const faces=this.dice.map(d=>topFace(d.body.rotation()));if(faces.some(f=>!f)||this.hasStack())this.finish(null,'斜め停止・重なりのため振り直し');else this.finish(faces.map(f=>f.value));}
  else if(this.tick*c.dt>=c.maxSeconds)this.finish(null,'まだ止まらないため振り直し');
 }
 finish(values,reason=null){this.done=true;this.result={values,reason,seed:this.seed,ticks:this.tick,seconds:this.tick*this.config.dt,contacts:{...this.contacts}};}
 dispose(){this.events.free();this.world.free();}
}
