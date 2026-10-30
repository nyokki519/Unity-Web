import * as THREE from '../../vendor/three/three.module.js';
import {DiceWorld} from './dice-physics.js';
import {bowlMesh,dieMesh,FACES,DICE_SIZE,BEVEL} from './dice-geometry.js';
import {metalSurfaces} from './metal-surfaces.js';
import {MetalAudio} from './metal-audio.js';

function geometry(data,isDie=false){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices,3));g.setIndex(data.indices);g.computeVertexNormals();
 const uv=[];for(let i=0;i<data.vertices.length;i+=3)uv.push(.5+data.vertices[i]/.278,.5+data.vertices[i+2]/.278);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 for(const group of data.groups||[])g.addGroup(group.start,group.count,group.materialIndex);
 if(isDie){const normals=[],k=DICE_SIZE/2-BEVEL;for(let i=0;i<data.vertices.length;i+=3){const p=data.vertices.slice(i,i+3),n=p.map(x=>x-Math.max(-k,Math.min(k,x))),l=Math.hypot(...n);normals.push(...n.map(x=>x/l));}g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));}
 return g;
}
export class DiceTray{
 constructor(canvas){
  this.canvas=canvas;this.paused=false;this.world=null;this.groups=[];this.last=0;this.accumulator=0;this.token=0;this.stopped=false;this.lastResult=null;this.targetQuaternion=new THREE.Quaternion();this.sound=new MetalAudio();this.dirty=true;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMappingExposure=1.05;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.001,3);this.camera.position.set(-.015,.30,.23);this.camera.lookAt(0,.012,0);
  this.scene.add(new THREE.HemisphereLight('#eef3ee','#172c25',.65));const light=new THREE.DirectionalLight('#fff7e5',2.4);light.position.set(-.18,.5,.2);light.castShadow=true;light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-.18,right:.18,top:.18,bottom:-.18,near:.1,far:1});light.shadow.bias=-.00002;light.shadow.normalBias=.00015;this.scene.add(light);const fill=new THREE.DirectionalLight('#d4e5ef',.65);fill.position.set(.28,.16,-.12);this.scene.add(fill);
  this.finish=metalSurfaces(this.renderer,()=>{this.dirty=true;});this.scene.environment=this.finish.env.texture;this.renderer.setClearColor(0x173e33,0);
  this.bowlGroup=new THREE.Group();this.scene.add(this.bowlGroup);
  this.bowlGeometry=geometry(bowlMesh());this.bowlMaterial=this.finish.bowlMaterials[0];const bowl=new THREE.Mesh(this.bowlGeometry,this.finish.bowlMaterials);bowl.receiveShadow=true;bowl.castShadow=true;this.bowlGroup.add(bowl);
  this.dieGeometry=geometry(dieMesh(),true);this.dieMaterial=this.finish.dieMaterial;this.faceGeometry=new THREE.PlaneGeometry(DICE_SIZE*.83,DICE_SIZE*.83);this.materials=this.finish.materials;
  this.stampGeometry=new THREE.PlaneGeometry(.084,.084);const stamp=new THREE.Mesh(this.stampGeometry,this.finish.stampMaterial);stamp.rotation.x=-Math.PI/2;stamp.position.y=.000025;stamp.receiveShadow=true;stamp.renderOrder=1;this.bowlGroup.add(stamp);
  this.preview=new THREE.Group();this.preview.name='display-dice-not-a-result';this.scene.add(this.preview);
  // A static display of the tools, not a throw or a game result. All dice rest on the flat shared surface.
  [[-.026,.012,0,0],[.002,-.014,Math.PI/2,.18],[.026,.015,-Math.PI/2,-.22]].forEach(([x,z,roll,yaw])=>{const die=this.makeDie();die.position.set(x,DICE_SIZE/2,z);die.quaternion.setFromEuler(new THREE.Euler(roll,yaw,0,'YXZ'));this.preview.add(die);});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 resize(){this.dirty=true;const {width,height}=this.canvas.getBoundingClientRect();this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);this.camera.aspect=width/height;this.camera.position.set(-.015,.325,.25);if(this.camera.aspect<1.05)this.camera.position.multiplyScalar(1.05/this.camera.aspect);if(this.zoomed)this.camera.position.multiplyScalar(.8);this.camera.lookAt(0,.012,0);this.camera.updateProjectionMatrix();}
 makeDie(){
  const g=new THREE.Group(),cube=new THREE.Mesh(this.dieGeometry,this.dieMaterial);cube.castShadow=true;cube.receiveShadow=true;g.add(cube);
  FACES.forEach((f,j)=>{const face=new THREE.Mesh(this.faceGeometry,this.materials[j]);face.position.set(...f.n.map(n=>n*(DICE_SIZE/2+.000015)));const matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.u),new THREE.Vector3(...f.v),new THREE.Vector3(...f.n));face.quaternion.setFromRotationMatrix(matrix);g.add(face);});return g;
 }
 setZoom(value){this.zoomed=value;this.resize();}
 setReduced(value){this.reduced=value;this.dirty=true;}
 setPaused(value){this.dirty=true;this.paused=value;this.sound.setPaused(value);this.last=0;this.accumulator=0;if(this.world){for(const d of this.world.dice)d.previous={p:{...d.body.translation()},q:{...d.body.rotation()}};}}
 clear(){this.dirty=true;this.sound.stop();for(const g of this.groups)this.scene.remove(g);this.groups=[];this.world?.dispose();this.world=null;this.bowlGroup.position.set(0,0,0);this.bowlGroup.quaternion.identity();this.preview.visible=true;}
 cancel(){this.token++;if(this.reject){this.reject(new DOMException('投擲を中止しました','AbortError'));this.resolve=this.reject=null;}this.clear();}
 async roll(seed){
  this.cancel();this.preview.visible=false;const token=this.token;const world=await DiceWorld.create(seed);if(token!==this.token){world.dispose();throw new DOMException('投擲を中止しました','AbortError');}
  this.world=world;this.dirty=true;this.accumulator=0;this.last=0;
  for(let i=0;i<3;i++){
   const g=this.makeDie();this.scene.add(g);this.groups.push(g);
  }
  return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
 }
 frame(now){
  if(this.stopped)return;this.raf=requestAnimationFrame(this.frame);const elapsed=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;const w=this.world,active=w&&!this.paused&&!w.done;
  if(active){this.accumulator+=elapsed;let steps=0;while(this.accumulator>=w.config.dt&&steps<24&&!w.done){w.step();this.accumulator-=w.config.dt;steps++;}}
  if(w){const alpha=this.paused||w.done?1:Math.min(1,this.accumulator/w.config.dt);w.dice.forEach((d,i)=>{const g=this.groups[i];g.visible=!this.reduced||w.done;g.position.copy(d.previous.p).lerp(d.body.translation(),alpha);g.quaternion.copy(d.previous.q).slerp(this.targetQuaternion.copy(d.body.rotation()),alpha);});
  }
  if(w)this.sound.consume(w.drainSounds());
  if(this.dirty||(active&&!this.reduced)||(w?.done&&this.resolve)){this.renderer.render(this.scene,this.camera);this.dirty=false;}
  if(w?.done&&this.resolve){const resolve=this.resolve;this.resolve=this.reject=null;this.lastResult=w.result;resolve(w.result);}
 }
 dispose(){this.stopped=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.cancel();this.sound.dispose();for(const g of [this.bowlGeometry,this.dieGeometry,this.faceGeometry,this.stampGeometry])g.dispose();this.finish.dispose();this.renderer.dispose();}
}
