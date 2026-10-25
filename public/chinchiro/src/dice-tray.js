import * as THREE from '../../vendor/three/three.module.js';
import {DiceWorld} from './dice-physics.js';
import {bowlMesh,dieMesh,FACES,DICE_SIZE} from './dice-geometry.js';

function geometry(data){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices,3));g.setIndex(data.indices);g.computeVertexNormals();return g;}
function faceTexture(n,image){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#faf4df';ctx.fillRect(0,0,256,256);
 if(n===1&&image){ctx.save();ctx.beginPath();ctx.arc(128,128,84,0,Math.PI*2);ctx.clip();ctx.globalCompositeOperation='multiply';ctx.drawImage(image,40,40,176,176);ctx.restore();}
 else{const positions={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n];ctx.fillStyle=n===1?'#9b4135':'#183e33';for(const i of positions){ctx.beginPath();ctx.arc(53+(i%3)*75,53+Math.floor(i/3)*75,n===1?28:19,0,Math.PI*2);ctx.fill();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export class DiceTray{
 constructor(canvas){
  this.canvas=canvas;this.paused=false;this.world=null;this.groups=[];this.last=0;this.accumulator=0;this.token=0;this.stopped=false;this.lastResult=null;this.targetQuaternion=new THREE.Quaternion();
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.001,3);this.camera.position.set(-.015,.30,.23);this.camera.lookAt(0,.012,0);
  this.scene.add(new THREE.HemisphereLight('#fffaef','#355d48',1.7));const light=new THREE.DirectionalLight('#fff1d5',2.3);light.position.set(-.18,.5,.2);light.castShadow=true;light.shadow.mapSize.set(512,512);Object.assign(light.shadow.camera,{left:-.18,right:.18,top:.18,bottom:-.18,near:.1,far:1});light.shadow.bias=-.00002;light.shadow.normalBias=.00015;this.scene.add(light);
  this.bowlGeometry=geometry(bowlMesh());this.bowlMaterial=new THREE.MeshStandardMaterial({color:'#b78d59',roughness:.5,metalness:.06});const bowl=new THREE.Mesh(this.bowlGeometry,this.bowlMaterial);bowl.receiveShadow=true;bowl.castShadow=true;this.scene.add(bowl);
  this.dieGeometry=geometry(dieMesh());this.dieMaterial=new THREE.MeshStandardMaterial({color:'#faf4df',roughness:.25,metalness:.02});this.faceGeometry=new THREE.PlaneGeometry(DICE_SIZE*.83,DICE_SIZE*.83);
  this.textures=FACES.map(f=>faceTexture(f.value));this.materials=this.textures.map(map=>new THREE.MeshStandardMaterial({map,roughness:.36,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  const image=new Image();image.onload=()=>{if(this.stopped)return;const old=this.textures[0],t=faceTexture(1,image);this.textures[0]=t;this.materials[0].map=t;this.materials[0].needsUpdate=true;old.dispose();};image.src='/assets/unity-mark.webp';
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 resize(){const {width,height}=this.canvas.getBoundingClientRect();this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);this.camera.aspect=width/height;this.camera.position.set(-.015,.325,.25);if(this.camera.aspect<1.05)this.camera.position.multiplyScalar(1.05/this.camera.aspect);if(this.zoomed)this.camera.position.multiplyScalar(.8);this.camera.lookAt(0,.012,0);this.camera.updateProjectionMatrix();}
 setZoom(value){this.zoomed=value;this.resize();}
 setReduced(value){this.reduced=value;}
 setPaused(value){this.paused=value;this.last=0;this.accumulator=0;if(this.world)for(const d of this.world.dice)d.previous={p:{...d.body.translation()},q:{...d.body.rotation()}};}
 clear(){for(const g of this.groups)this.scene.remove(g);this.groups=[];this.world?.dispose();this.world=null;}
 cancel(){this.token++;if(this.reject){this.reject(new DOMException('投擲を中止しました','AbortError'));this.resolve=this.reject=null;}this.clear();}
 async roll(seed){
  this.cancel();const token=this.token;const world=await DiceWorld.create(seed);if(token!==this.token){world.dispose();throw new DOMException('投擲を中止しました','AbortError');}
  this.world=world;this.accumulator=0;this.last=0;
  for(let i=0;i<3;i++){
   const g=new THREE.Group(),cube=new THREE.Mesh(this.dieGeometry,this.dieMaterial);cube.castShadow=true;cube.receiveShadow=true;g.add(cube);
   FACES.forEach((f,j)=>{const face=new THREE.Mesh(this.faceGeometry,this.materials[j]);face.position.set(...f.n.map(n=>n*(DICE_SIZE/2+.000015)));const matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.u),new THREE.Vector3(...f.v),new THREE.Vector3(...f.n));face.quaternion.setFromRotationMatrix(matrix);g.add(face);});this.scene.add(g);this.groups.push(g);
  }
  return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
 }
 frame(now){
  if(this.stopped)return;this.raf=requestAnimationFrame(this.frame);const elapsed=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;const w=this.world;
  if(w&&!this.paused&&!w.done){this.accumulator+=elapsed;let steps=0;while(this.accumulator>=w.config.dt&&steps<24&&!w.done){w.step();this.accumulator-=w.config.dt;steps++;}}
  if(w){const alpha=this.paused||w.done?1:Math.min(1,this.accumulator/w.config.dt);w.dice.forEach((d,i)=>{const g=this.groups[i];g.visible=!this.reduced||w.done;g.position.copy(d.previous.p).lerp(d.body.translation(),alpha);g.quaternion.copy(d.previous.q).slerp(this.targetQuaternion.copy(d.body.rotation()),alpha);});}
  this.renderer.render(this.scene,this.camera);
  if(w?.done&&this.resolve){const resolve=this.resolve;this.resolve=this.reject=null;this.lastResult=w.result;resolve(w.result);}
 }
 dispose(){this.stopped=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.cancel();for(const g of [this.bowlGeometry,this.dieGeometry,this.faceGeometry])g.dispose();for(const m of [this.bowlMaterial,this.dieMaterial,...this.materials])m.dispose();for(const t of this.textures)t.dispose();this.renderer.dispose();}
}
