import test from 'node:test';
import assert from 'node:assert/strict';
import {DiceWorld} from '../public/chinchiro/src/dice-physics.js';
import {FACES,rotate} from '../public/chinchiro/src/dice-geometry.js';

test('the dish is a fixed rigid body for the whole physical throw',async()=>{
 const w=await DiceWorld.create(23);
 try{
  assert.ok(w.bowlBody.isFixed(),'the dish must be fixed, not a prescribed hand movement');
  while(!w.done){w.step();assert.deepEqual({...w.bowlBody.translation()},{x:0,y:0,z:0});assert.deepEqual({...w.bowlBody.rotation()},{x:0,y:0,z:0,w:1});w.drainSounds();}
 }finally{w.dispose();}
});

test('airborne dice receive no extra kick or time-dependent torque after release',async()=>{
 const w=await DiceWorld.create(9,{config:{gravity:0,linearDamping:0,angularDamping:0}});
 try{
  const speed={x:.02,y:0,z:0};w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.03,y:.3,z:0},true);d.body.setLinvel(speed,true);d.body.setAngvel({x:0,y:12,z:0},true);});
  for(let i=0;i<240;i++){w.step();for(const d of w.dice){assert.ok(Math.abs(d.body.linvel().x-speed.x)<1e-6);assert.ok(Math.abs(d.body.angvel().y-12)<.03);}w.drainSounds();}
 }finally{w.dispose();}
});

test('a die cannot pass through the visible flat bottom during a fixed-dish throw',async()=>{
 for(const seed of [25,46,47]){
  const w=await DiceWorld.create(seed,{config:{launchHeight:.055,restitution:.7,bowlRestitution:.7,friction:.2,bowlFriction:.2}});
  try{while(!w.done){w.step();for(const d of w.dice){const p=d.body.translation();if(Math.hypot(p.x,p.z)<.034)assert.ok(p.y>=-.001,`seed ${seed} penetrated the bottom at ${w.tick*w.config.dt}s`);}w.drainSounds();}}finally{w.dispose();}
 }
});

const faces=w=>w.poses().map(p=>FACES.map(f=>({value:f.value,y:rotate(p.q,f.n)[1]})).sort((a,b)=>b.y-a.y)[0].value);
test('dice change their upper faces after first landing while the dish stays fixed',async()=>{
 let changed=0;
 for(let seed=1;seed<=12;seed++){
  const w=await DiceWorld.create(seed);let landed=null,first=null,turned=false;
  try{while(!w.done){w.step();if(landed===null&&w.contacts.floor+w.contacts.wall>0){landed=w.tick*w.config.dt;first=faces(w);}if(landed!==null&&w.tick*w.config.dt>landed+.15&&faces(w).some((f,i)=>f!==first[i]))turned=true;w.drainSounds();}if(turned)changed++;}finally{w.dispose();}
 }
 assert.ok(changed>=10,`only ${changed}/12 have a face change at least150ms after initial landing`);
});

test('passive dice and a fixed dish do not create mechanical energy after release',async()=>{
 for(const seed of [1,4,9,23,41,1097]){
  const w=await DiceWorld.create(seed);
  const energy=()=>w.dice.reduce((sum,d)=>{const v=d.body.linvel(),a=d.body.angvel(),p=d.body.translation(),I=d.body.principalInertia();return sum+d.body.mass()*w.config.gravity*p.y+.5*d.body.mass()*(v.x*v.x+v.y*v.y+v.z*v.z)+(I.x+I.y+I.z)/6*(a.x*a.x+a.y*a.y+a.z*a.z);},0);
  try{const initial=energy();while(!w.done){w.step();assert.ok(energy()<=initial*1.05+.0001,`seed${seed} gained energy without external work`);w.drainSounds();}}finally{w.dispose();}
 }
});

test('a flat die bounces on landing without rebounding faster than its impact speed',async()=>{
 const w=await DiceWorld.create(17);
 try{
  w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.025,y:.075,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  let rebound=null;for(let i=0;i<80;i++){const before=w.dice[1].body.linvel().y;w.step();const after=w.dice[1].body.linvel().y;if(before<-.2&&after>.1){rebound={before,after};break;}}
  assert.ok(rebound,'the flat die must bounce instead of sticking on first contact');const e=(w.config.restitution+w.config.bowlRestitution)/2;
  assert.ok(rebound.after>=-rebound.before*e*.8);assert.ok(rebound.after<=-rebound.before*1.02);
 }finally{w.dispose();}
});

test('free flight follows SI gravity instead of an arbitrary velocity slowdown',async()=>{
 const w=await DiceWorld.create(33);
 try{w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.03,y:.2,z:0},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});for(let i=0;i<24;i++)w.step();const t=24*w.config.dt;for(const d of w.dice){assert.ok(Math.abs(d.body.linvel().y+w.config.gravity*t)<.0001);assert.ok(Math.abs(d.body.translation().y-(.2-.5*w.config.gravity*t*t))<.0003);}}finally{w.dispose();}
});


test('a single-point sphere calibration follows the configured normal restitution',async()=>{
 const {default:RAPIER}=await import('../public/vendor/rapier/rapier.mjs');const w=await DiceWorld.create(17);
 try{w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.03,y:i===1?.075:.008,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});w.dice[1].collider.setShape(new RAPIER.Ball(.008*w.units));let ratio=null;
  for(let i=0;i<80;i++){const before=w.dice[1].body.linvel().y;w.step();const after=w.dice[1].body.linvel().y;if(before<-.2&&after>.1){ratio=after/-before;break;}}assert.notEqual(ratio,null);const e=(w.config.restitution+w.config.bowlRestitution)/2;assert.ok(Math.abs(ratio-e)<e*.05);
 }finally{w.dispose();}
});

test('dice cannot fall below the base after crossing from the curved wall',async()=>{
 for(const seed of [97,250,309]){
  const w=await DiceWorld.create(seed);
  try{while(!w.done){w.step();for(const d of w.dice){const p=d.body.translation();if(Math.hypot(p.x,p.z)<.034)assert.ok(p.y>=-.001,`seed${seed} lost support entering the base`);}w.drainSounds();}}finally{w.dispose();}
 }
});

test('solid collision cells use the same visible wall vertices and convex faces',async()=>{
 const {bowlMesh,bowlSolids,BOWL}=await import('../public/chinchiro/src/dice-geometry.js');const mesh=bowlMesh(),cloud=[];for(let i=0;i<mesh.vertices.length;i+=3)cloud.push(mesh.vertices.slice(i,i+3));const parts=bowlSolids();assert.equal(parts.length,BOWL.segments*(BOWL.profileSegments+1));
 for(const part of parts){const p=[];for(let i=0;i<part.vertices.length;i+=3){const v=[0,1,2].map(j=>part.vertices[i+j]+part.centre[j]);p.push(v);assert.ok(cloud.some(q=>Math.hypot(...q.map((x,j)=>x-v[j]))<1e-7),'a contact cell introduced a vertex absent from the visible dish');}
  if(p.length===8)for(const face of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]]){
   const a=p[face[0]],u=p[face[1]].map((v,j)=>v-a[j]),v=p[face[2]].map((v,j)=>v-a[j]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n),side=part.centre.reduce((s,x,j)=>s+(x-a[j])*n[j],0)>0?-1:1;
   assert.ok(l>0);for(const q of p)assert.ok(q.reduce((s,x,j)=>s+(x-a[j])*n[j]*side,0)/l<1e-7,'nonconvex wall cell would fill visible air');
  }
 }
});

test('valid convex die contacts keep supporting the die above the four-millimetre base',async()=>{
 for(const seed of [73,115,117,296]){const w=await DiceWorld.create(seed);try{while(!w.done){w.step();for(const d of w.dice){const p=d.body.translation();if(Math.hypot(p.x,p.z)<.034)assert.ok(p.y>=-.001,`seed${seed}: invalid contact geometry allowed a floor crossing`);}w.drainSounds();}}finally{w.dispose();}}
});

test('explicit die collision faces never violate convex supporting planes',async()=>{
 const w=await DiceWorld.create(1);
 try{const shape=w.dice[0].collider.shape;if(shape.indices){const points=[];for(let i=0;i<shape.vertices.length;i+=3)points.push(Array.from(shape.vertices.slice(i,i+3)));for(let i=0;i<shape.indices.length;i+=3){const [a,b,c]=Array.from(shape.indices.slice(i,i+3),j=>points[j]),u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);if(!l)continue;assert.ok(points.every(p=>p.reduce((s,x,j)=>s+(x-a[j])*n[j],0)/l<1e-7),'nonconvex bevel triangles cannot be supplied as convex collision topology');}}}finally{w.dispose();}
});

test('solver length units preserve SI mass, free-flight gravity and elapsed time',async()=>{
 const a=await DiceWorld.create(7,{config:{solverUnitsPerMetre:1}}),b=await DiceWorld.create(7,{config:{solverUnitsPerMetre:100}});
 try{assert.ok(Math.abs(b.world.gravity.y+b.config.gravity*100)<.001,'centimetre solver gravity must be980.665cm/s², not9.8');for(const w of [a,b])w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.03,y:.2,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:.1,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});for(let i=0;i<24;i++){a.step();b.step();}assert.equal(a.tick,b.tick);for(let i=0;i<3;i++){assert.ok(Math.abs(a.dice[i].body.mass()-b.dice[i].body.mass())<1e-6);assert.ok(Math.abs(a.dice[i].body.principalInertia().x-b.dice[i].body.principalInertia().x)<1e-8);for(const k of ['x','y','z']){assert.ok(Math.abs(a.dice[i].body.translation()[k]-b.dice[i].body.translation()[k])<.00003);assert.ok(Math.abs(a.dice[i].body.linvel()[k]-b.dice[i].body.linvel()[k])<.0001);}}}finally{a.dispose();b.dispose();}
});
