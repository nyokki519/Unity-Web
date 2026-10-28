import {orbitPositions} from './balance.js';
import {ITEM_UI} from './feedback.js';
import * as THREE from '../vendor/three/three.module.js';

// All artwork is drawn locally. Coordinates, clocks and effects belong to this
// presentation layer; the deterministic simulation is only ever read.
const W=480,H=720,TAU=Math.PI*2;
const palettes=[['#071f29','#0a3d42','#5ee4c0','#d3bc78'],['#130e26','#352244','#be83ff','#f6a66b'],['#071f32','#163d57','#a6eaff','#d4e9ed'],['#081a25','#193947','#44d8de','#efc77c'],['#241c17','#413528','#ffc982','#8cffe2'],['#160e2b','#382148','#e28aff','#72ffe0']];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texture(c){const t=new THREE.CanvasTexture(c);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;return t;}
function poly(g,points,fill,stroke,width=1){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function line(g,x,y,x2,y2,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();}
function glow(g,x,y,r,color){const d=g.createRadialGradient(x,y,0,x,y,r);d.addColorStop(0,color);d.addColorStop(1,'transparent');g.fillStyle=d;g.fillRect(x-r,y-r,r*2,r*2);}
function hullArt(type,boss=false,player=false){
 const c=canvas(boss?512:256,boss?512:256),g=c.getContext('2d'),s=c.width/256;g.scale(s,s);const random=rng(800+type*31+(boss?400:0));
 const accent=player?['#7bffdb','#84dfff','#dfbaff','#ffcd86','#b4f9a5','#73d9d8','#fb9aba','#ffefb1'][type%8]:boss?['#ff8ca4','#d8a0ff','#ffcc86','#82e5ff','#ffdc8c','#eb99ff'][type%6]:['#ff9a99','#ffbc7f','#db9aff','#ff749b'][type%4];
 g.translate(128,128);if(!player)g.rotate(Math.PI); // Ships point toward the opposition.
 g.shadowColor=accent;g.shadowBlur=12;
 const wing=player?50+(type%3)*12:boss?107:53+(type%4)*9;
 // Engine chambers, then layered asymmetric-looking but readable armored wings.
 for(const side of [-1,1]){
  g.fillStyle='#03111a';g.fillRect(side*34-12,34,24,47);g.fillStyle=accent;g.fillRect(side*34-7,52,14,23);
  glow(g,side*34,76,23,accent+'99');
  const pts=[[side*12,-45],[side*38,-28],[side*wing,28],[side*(wing-6),68],[side*28,41],[side*14,65]];
  let grad=g.createLinearGradient(0,-50,0,70);grad.addColorStop(0,player?'#ecf0d9':'#a5a9b5');grad.addColorStop(.45,player?'#5a8584':'#4a5064');grad.addColorStop(1,'#152c37');poly(g,pts,grad,'#b8e3db',1.2);
  poly(g,[[side*29,-19],[side*(wing-13),33],[side*(wing-17),49],[side*30,25]],'#163c46',accent,1);
  poly(g,[[side*39,2],[side*(wing-23),32],[side*40,24]],'#a2bcb0');
  line(g,side*34,35,side*(wing-10),59,'#051e29',3);
  for(let j=0;j<4;j++)line(g,side*(42+j*4),34+j*3,side*(47+j*4),37+j*3,accent,1.8);
  g.fillStyle='#0a202b';g.fillRect(side*25-4,-29,8,39);g.fillStyle='#dbdbb6';g.fillRect(side*25-2,-34,4,16);
  g.fillStyle=accent;g.fillRect(side*(wing-12)-2,40,4,9);
 }
 const grad=g.createLinearGradient(-16,0,18,0);grad.addColorStop(0,'#224b55');grad.addColorStop(.45,player?'#e1ecd5':'#b1bbc1');grad.addColorStop(.6,player?'#abc4b4':'#788f9d');grad.addColorStop(1,'#12313f');
 poly(g,[[-8,-95],[8,-95],[21,-42],[17,53],[0,73],[-17,53],[-21,-42]],grad,'#bad4cc',1.2);
 poly(g,[[0,-83],[9,-38],[6,16],[0,27],[-6,16],[-9,-38]],'#082630',accent,1);
 glow(g,0,-18,22,accent+'88');poly(g,[[0,-58],[6,-33],[5,-9],[0,3],[-5,-9],[-6,-33]],accent);
 for(let j=0;j<6;j++)line(g,-12,28+j*4,12,28+j*4,'#143440',1.2);
 g.fillStyle=accent;g.fillRect(-3,49,6,10);g.shadowBlur=0;
 if(boss){
  for(const side of [-1,1]){
   poly(g,[[side*27,-43],[side*64,-88],[side*102,-63],[side*113,22],[side*97,71],[side*68,60],[side*49,8]],'#253d4b','#a3b5b6',2);
   poly(g,[[side*59,-53],[side*83,-69],[side*96,-29],[side*95,39],[side*79,52],[side*65,3]],'#536578','#bccbc9',1);
   for(let k=0;k<6;k++)line(g,side*68,-29+k*9,side*93,-23+k*9,'#152a38',3);
   glow(g,side*80,10,26,accent+'bb');g.fillStyle='#152630';g.beginPath();g.arc(side*80,8,15,0,TAU);g.fill();g.strokeStyle=accent;g.lineWidth=3;g.stroke();g.fillStyle=accent;g.beginPath();g.arc(side*80,8,7,0,TAU);g.fill();
   g.fillStyle='#c1b9a2';g.fillRect(side*80-5,41,10,40);g.fillStyle='#283442';g.fillRect(side*80-2,43,4,36);
  }
  poly(g,[[-24,-69],[0,-104],[24,-69],[29,-4],[0,25],[-29,-4]],'#9aa6ac','#dae1d5',2);glow(g,0,-28,35,accent+'bb');
  poly(g,[[0,-69],[14,-43],[12,-16],[0,-2],[-12,-16],[-14,-43]],'#132a3b',accent,2);g.fillStyle=accent;g.beginPath();g.arc(0,-30,8,0,TAU);g.fill();
 }
 // Fine service markings and rivets stay visible at normal sprite sizes.
 for(let j=0;j<(boss?40:18);j++){const x=(random()-.5)*(boss?165:70),y=random()*90-25;g.fillStyle=j%3? '#d6dcc2':'#122a35';g.fillRect(x,y,1.4,1.4);}
 return texture(c);
}
function backgroundArt(stage){
 const c=canvas(960,2880),g=c.getContext('2d'),p=palettes[stage%6],r=rng(5281+stage*83);g.fillStyle=p[0];g.fillRect(0,0,960,2880);
 // Large soft color fields establish depth without hiding incoming fire.
 for(let i=0;i<25;i++)glow(g,r()*960,r()*2880,100+r()*350,p[1]+'99');
 if(stage===0){ // Tidal megacity, suspended over an emerald ocean.
  for(let side=0;side<2;side++)for(let i=0;i<65;i++){
   let w=35+r()*105,h=80+r()*250,x=side?750+r()*180:r()*140-45,y=r()*2880;
   g.fillStyle='#03141e';g.fillRect(x+10,y+16,w,h);g.fillStyle=['#11343b','#18444a','#214b4e'][i%3];g.fillRect(x,y,w,h);g.strokeStyle='#37716a';g.lineWidth=2;g.strokeRect(x,y,w,h);
   g.fillStyle='#0a242f';g.fillRect(x+8,y+9,w-16,h-18);
   for(let k=0;k<7;k++){g.fillStyle=k%3?'#468e80':'#a9c8a1';g.globalAlpha=.2+r()*.45;g.fillRect(x+12+(k%3)*19,y+14+Math.floor(k/3)*25,10,3);}g.globalAlpha=1;
   line(g,x+8,y+h-15,x+w-8,y+h-15,'#396158',2);
  }
  for(let i=0;i<180;i++){const y=r()*2880,x=200+r()*550;line(g,x,y,x+10+r()*65,y,'#256065',1);}
  for(let y=160;y<2880;y+=630){g.fillStyle='#173d45';g.fillRect(0,y,960,35);g.fillStyle='#4e7b72';g.fillRect(0,y+6,960,2);for(let x=0;x<960;x+=60){g.fillStyle='#bad1a5';g.fillRect(x,y+17,12,2);}}
 }else if(stage===1){ // Violet debris field and orbital infrastructure.
  for(let i=0;i<80;i++){
   const x=r()*960,y=r()*2880,z=8+r()*45;g.save();g.translate(x,y);g.rotate(r()*TAU);const grad=g.createLinearGradient(-z,-z,z,z);grad.addColorStop(0,'#687079');grad.addColorStop(.4,'#343548');grad.addColorStop(1,'#151c30');const pts=[];for(let j=0;j<9;j++){const a=j/9*TAU,rr=z*(.65+r()*.35);pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}poly(g,pts,grad,'#535267');line(g,-z*.3,-z*.5,z*.35,z*.2,'#80818b',1);g.restore();
  }
  g.save();g.translate(830,1050);g.rotate(.28);for(let i=0;i<5;i++){g.strokeStyle=['#22263c','#676078','#2b3046'][i%3];g.lineWidth=12-i;g.beginPath();g.ellipse(0,0,300+i*18,480+i*18,0,0,TAU);g.stroke();}g.restore();
 }else if(stage===2){ // Glacial stratosphere, river-like ice fissures.
  for(let side=0;side<2;side++)for(let i=0;i<22;i++){
   const x=side?790+r()*160:r()*140,y=r()*2880,sz=45+r()*120;poly(g,[[x,y-sz],[x+sz*.8,y-sz*.2],[x+sz*.6,y+sz],[x-sz*.6,y+sz*.7],[x-sz,y]],'#173c53','#306278',2);poly(g,[[x,y-sz],[x+sz*.8,y-sz*.2],[x,y+sz*.2],[x-sz,y]],'#335e73');line(g,x,y-sz,x,y+sz*.2,'#8bb1bd',2);
  }
  for(let i=0;i<28;i++){g.strokeStyle='#367385';g.lineWidth=1;g.beginPath();let x=r()*960,y=r()*2880;g.moveTo(x,y);for(let j=0;j<6;j++){x+=(r()-.5)*130;y+=25+r()*35;g.lineTo(x,y);}g.stroke();}
 }else if(stage===3){ // Machine cathedral: repeating side conduits and ribs.
  for(let y=0;y<2880;y+=240){
   for(let side=0;side<2;side++){g.save();if(side){g.translate(960,0);g.scale(-1,1);}poly(g,[[0,y],[155,y],[205,y+55],[205,y+140],[140,y+203],[0,y+203]],'#17343d','#42646b',3);g.fillStyle='#081e2a';g.fillRect(15,y+17,115,160);for(let j=0;j<8;j++)line(g,20,y+27+j*18,120,y+27+j*18,'#2d505a',6);g.fillStyle='#4a9e9b';g.fillRect(142,y+47,4,85);g.fillStyle='#b9bc82';g.fillRect(160,y+66,3,33);g.restore();}
   line(g,210,y+60,750,y+60,'#153d48',2);line(g,220,y+64,740,y+64,'#1c4c54',1);
  }
  for(let x=225;x<750;x+=85)line(g,x,0,x,2880,'#17404a',1);
 }else{ // Solar fortress (and a violet mirror world for the secret stage).
  for(let y=0;y<2880;y+=210){for(let side=0;side<2;side++){g.save();if(side){g.translate(960,0);g.scale(-1,1);}poly(g,[[0,y],[165,y],[235,y+66],[186,y+160],[0,y+187]],stage===5?'#392940':'#3a3429',p[3]+'66',2);poly(g,[[12,y+14],[147,y+14],[203,y+68],[164,y+138],[12,y+161]],p[0],p[3]+'44');for(let j=0;j<6;j++)line(g,27+j*22,y+30,27+j*22,y+115,p[3]+'44',2);g.fillStyle=p[2];g.globalAlpha=.5;g.fillRect(170,y+69,11,25);g.globalAlpha=1;g.restore();}}
  for(let i=0;i<10;i++){g.strokeStyle=p[2]+'15';g.lineWidth=2;g.beginPath();g.arc(480,280+i*380,200+i%3*55,0,TAU);g.stroke();}
 }
 // Tiny navigation lights and suspended dust unify the original world.
 for(let i=0;i<450;i++){g.globalAlpha=.12+r()*.4;g.fillStyle=i%4?p[2]:'#fff2d6';const z=i%7===0?2:1;g.fillRect(r()*960,r()*2880,z,z);}g.globalAlpha=1;
 const edge=g.createLinearGradient(0,0,960,0);edge.addColorStop(0,'#00000088');edge.addColorStop(.24,'transparent');edge.addColorStop(.76,'transparent');edge.addColorStop(1,'#00000088');g.fillStyle=edge;g.fillRect(0,0,960,2880);
 return texture(c);
}
function softTexture(){const c=canvas(128,128),g=c.getContext('2d');glow(g,64,64,63,'#ffffff');return texture(c);}
function barrierTexture(){const c=canvas(256,256),g=c.getContext('2d');const points=Array.from({length:6},(_,i)=>[128+Math.cos(i*TAU/6)*108,128+Math.sin(i*TAU/6)*108]);poly(g,points,'#74bfff14','#c4e6ff',5);g.strokeStyle='#85caff66';g.lineWidth=1;g.beginPath();g.arc(128,128,94,0,TAU);g.stroke();return texture(c);}
function ringTexture(){const c=canvas(256,256),g=c.getContext('2d');g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(128,128,111,0,TAU);g.stroke();g.strokeStyle='#ffffff55';g.lineWidth=1;g.beginPath();g.arc(128,128,104,0,TAU);g.stroke();for(let i=0;i<12;i++){const a=i/12*TAU;line(g,128+Math.cos(a)*99,128+Math.sin(a)*99,128+Math.cos(a)*114,128+Math.sin(a)*114,'#fff',3);}return texture(c);}
const bulletVertex=`attribute float aKind; varying vec2 vUv; varying vec3 vColor; varying float vKind; void main(){vUv=uv;vColor=instanceColor;vKind=aKind;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const bulletFragment=`precision highp float; varying vec2 vUv; varying vec3 vColor; varying float vKind; void main(){vec2 p=(vUv-.5)*2.;float d=length(p);float a=1.-smoothstep(.68,1.,d);float core=1.-smoothstep(.18,.57,d);float rim=exp(-pow((d-.57)*10.,2.));vec3 col=mix(vColor,vColor*.45+vec3(.65),core*.85);if(vKind>1.5&&vKind<2.5){a*=smoothstep(.27,.44,d);col+=rim*.25;}if(vKind>2.5){float diamond=abs(p.x)+abs(p.y);a=1.-smoothstep(.65,1.,diamond);core=1.-smoothstep(.0,.5,diamond);col=mix(vColor,vec3(1.),core*.9);}if(a<.015)discard;gl_FragColor=vec4(col,a);}`;

export class ShootingRenderer {
 constructor(target,{quality='high',reduced=false}={}){
  this.canvas=target;this.quality=quality;this.reduced=!!reduced;this.dead=false;this.time=0;this.last=performance.now();this.stage=-1;this.effects=[];this.rings=[];this.particles=[];this.shake=0;this.flash=0;this.warning=0;
  this.renderer=new THREE.WebGLRenderer({canvas:target,antialias:false,alpha:false,powerPreference:'high-performance'});this.renderer.setClearColor(0x061a22,1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,W,0,H,-100,100);this.camera.position.z=50;
  this.geometry=new THREE.PlaneGeometry(1,1);this.resources=[];this.color=new THREE.Color();this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.scale=new THREE.Vector3();this.quat=new THREE.Quaternion();this.axis=new THREE.Vector3(0,0,1);
  this.backgrounds=Array.from({length:6},(_,i)=>backgroundArt(i));this.shipTextures=Array.from({length:8},(_,i)=>hullArt(i,false,true));this.enemyTextures=Array.from({length:12},(_,i)=>hullArt(i));this.bossTextures=Array.from({length:6},(_,i)=>hullArt(i,true));this.soft=softTexture();this.ring=ringTexture();this.barrier=barrierTexture();
  this.bgMeshes=[this.sprite(this.backgrounds[0],480,1440,-20),this.sprite(this.backgrounds[0],480,1440,-20)];this.bgMeshes.forEach(m=>m.material.transparent=false);
  this.stars=this.createStars();this.enemySprites=[];this.partSprites=[];this.hpSprites=[];this.itemSprites=[];this.optionSprites=[];this.orbitSprites=[];this.hazardSprites=[];this.turretSprites=[];this.beamSprites=[];
  this.playerGlow=this.sprite(this.soft,90,90,0,0x63f8d3,THREE.AdditiveBlending);this.player=this.sprite(this.shipTextures[0],59,59,5);this.thrusts=Array.from({length:4},()=>this.sprite(this.soft,16,38,3,0x63ffde,THREE.AdditiveBlending));
  this.focus=this.sprite(this.ring,34,34,8,0x8affdd);this.hitDot=this.sprite(this.soft,9,9,9,0xffffff);this.shield=this.sprite(this.ring,74,74,6,0x97ffe1,THREE.AdditiveBlending);this.shield.visible=false;this.focus.visible=false;this.hitDot.visible=false;
  this.enemyBullets=this.bulletMesh(16384,9);this.allyBullets=this.bulletMesh(8192,4);this.particleMesh=this.bulletMesh(1800,12);this.particleMesh.material.blending=THREE.AdditiveBlending;
  // Only upload/cover HUD regions. Most of the playfield stays free of a
  // full-screen transparent canvas pass, especially important on mobile GPUs.
  this.hudCanvas=canvas(960,1440);this.hudRegions=[[0,150],[640,80],[235,70]].map(([y,h])=>{const c=canvas(960,h*2),map=texture(c),mesh=this.sprite(map,480,h,30);mesh.position.set(240,y+h*.5,30);return{y,h,canvas:c,map,mesh};});
  this.flashMesh=this.solid(480,720,31,0xc7ffeb);this.flashMesh.position.set(240,360,31);this.flashMesh.visible=false;
  this.resize();this.observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>this.resize()):null;this.observer?.observe(target);
 }
 sprite(map,w,h,z=0,color=0xffffff,blending=THREE.NormalBlending){const material=new THREE.MeshBasicMaterial({map,color,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,blending});const mesh=new THREE.Mesh(this.geometry,material);mesh.scale.set(w,h,1);mesh.position.z=z;mesh.renderOrder=z+30;mesh.frustumCulled=false;this.scene.add(mesh);return mesh;}
 solid(w,h,z,color){return this.sprite(null,w,h,z,color);}
 bulletMesh(capacity,z){const geometry=this.geometry.clone();geometry.setAttribute('aKind',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));const material=new THREE.ShaderMaterial({vertexShader:bulletVertex,fragmentShader:bulletFragment,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide});const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.renderOrder=z+30;mesh.frustumCulled=false;this.scene.add(mesh);return mesh;}
 createStars(){const stars=[];const random=rng(981);for(let i=0;i<95;i++)stars.push({x:random()*W,y:random()*H,z:.25+random()*.7,size:.6+random()*1.2});const mesh=this.bulletMesh(100,-10);mesh.material.blending=THREE.AdditiveBlending;this.starMesh=mesh;return stars;}
 instance(mesh,index,x,y,w,h,angle,color,kind=0){this.position.set(x,y,0);this.scale.set(w,h,1);this.quat.setFromAxisAngle(this.axis,angle);this.matrix.compose(this.position,this.quat,this.scale);mesh.setMatrixAt(index,this.matrix);this.color.set(color);mesh.setColorAt(index,this.color);mesh.geometry.attributes.aKind.array[index]=kind;}
 finish(mesh,count){mesh.count=count;if(!count)return;for(const [attribute,size]of [[mesh.instanceMatrix,16],[mesh.instanceColor,3],[mesh.geometry.attributes.aKind,1]]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*size);attribute.needsUpdate=true;}}
 pooled(list,index,map,w,h,z,color=0xffffff){let mesh=list[index];if(!mesh){mesh=this.sprite(map,w,h,z,color);list[index]=mesh;}mesh.visible=true;if(mesh.material.map!==map){mesh.material.map=map;mesh.material.needsUpdate=true;}mesh.material.color.set(color);mesh.scale.set(w,h,1);mesh.material.opacity=1;mesh.rotation.z=0;return mesh;}
 hideTail(list,n){for(let i=n;i<list.length;i++)list[i].visible=false;}
 setQuality(value){this.quality=value==='low'?'low':'high';this.resize();}
 setReduced(value){this.reduced=!!value;this.shake=0;this.flash=0;}
 resize(){if(this.dead)return;const rect=this.canvas.getBoundingClientRect();const width=Math.max(1,Math.round(rect.width||480)),height=Math.max(1,Math.round(rect.height||720));this.renderer.setPixelRatio(this.quality==='low'?1:Math.min(window.devicePixelRatio||1,2));this.renderer.setSize(width,height,false);}
 event(e){
  if(!e||this.dead)return;const x=Number.isFinite(e.x)?e.x:240,y=Number.isFinite(e.y)?e.y:300;const type=e.type;
  if(type==='warning'||type==='boss'){if(type==='warning'&&(!e.text||e.text==='照射予告'))return;this.warning=3.2;this.warningText=e.text||'高エネルギー反応 · 戦闘態勢へ';this.warningBoss=type==='boss';return;}
  if(type==='chain'&&Number.isFinite(e.fromX)&&Number.isFinite(e.fromY)){const points=[[e.fromX,e.fromY]];for(let j=1;j<5;j++)points.push([e.fromX+(x-e.fromX)*j/5+(Math.random()-.5)*16,e.fromY+(y-e.fromY)*j/5+(Math.random()-.5)*12]);points.push([x,y]);this.effects.push({points,life:.14});return;}
  if(type==='shot')return;
  const big=['bomb','special','overdrive','clear','gameover'].includes(type)||type==='explosion'&&e.boss,explosive=['explosion','part'].includes(type),color=type==='missile'||type==='laser'||type==='graze'?0x9affd7:type==='item'||type==='evolve'?0xffe3a0:big?0x75ffe0:type==='hit'?0xffefca:0xffab78;
  const amount=this.quality==='low'||this.reduced?(big?28:explosive?14:4):(big?95:explosive?38:type==='graze'?5:9);
  for(let i=0;i<amount;i++){const angle=Math.random()*TAU,speed=(big?110:explosive?65:22)+Math.random()*(big?320:120),life=(big?.6:.24)+Math.random()*.55;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,size:big?3+Math.random()*5:1.5+Math.random()*3,color});}
  if(big||explosive||type==='evolve'){this.rings.push({x,y,age:0,life:big?1:.55,size:big?500:95,color,mesh:null});if(!this.reduced){this.shake=Math.max(this.shake,big?8:3);this.flash=Math.max(this.flash,big?.15:.035);}}
  if(this.particles.length>1700)this.particles.splice(0,this.particles.length-1700);
 }
 render(game,alpha=1){
  if(this.dead)return;const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;this.time+=dt;const t=this.time,stage=game?.stage||0;
  if(stage!==this.stage){this.stage=stage;this.bgMeshes.forEach(m=>m.material.map=this.backgrounds[stage%6]);}
  const scroll=this.reduced?0:(game?game.stageTime*21:t*12)%1440;
  // Two tall, repeating tiles cover the entire viewport while travelling down.
  const base=scroll-720;this.bgMeshes[0].position.set(240,base,-20);this.bgMeshes[1].position.set(240,base+1440,-20);
  let starCount=0;for(const s of this.stars){const y=(s.y+(this.reduced?0:t*(8+s.z*22)))%H;this.instance(this.starMesh,starCount++,s.x,y,s.size,s.size*(1+(this.reduced?0:s.z)),0,stage===1?0xb9a4e0:0x84c7c3); }this.finish(this.starMesh,this.quality==='low'?45:starCount);
  this.drawPlayer(game,t);this.drawEnemies(game,t);this.drawBullets(game,alpha);this.drawItems(game,t);this.drawHazards(game,t);this.updateEffects(dt);this.drawHUD(game,t,dt);
  if(this.reduced){this.camera.position.x=0;this.camera.position.y=0;}else{this.camera.position.x=(Math.random()-.5)*this.shake;this.camera.position.y=(Math.random()-.5)*this.shake;this.shake=Math.max(0,this.shake-dt*24);}
  this.renderer.render(this.scene,this.camera);
 }
 drawPlayer(game,t){
  const p=game?.player,x=p?.x??240,y=p?.y??575,id=game?.options?.ship??0;this.player.material.map=this.shipTextures[id%8];this.player.position.set(x,y,5);this.player.rotation.z=this.reduced?0:game?Math.sin(t*3)*.018:Math.sin(t*.8)*.06;
  this.player.visible=!p||!p.invincible||Math.floor(t*22)%3!==0;this.playerGlow.position.set(x,y+4,0);this.playerGlow.material.opacity=p?.focus?.16:.1;this.playerGlow.visible=true;
  for(let i=0;i<4;i++){const m=this.thrusts[i],outer=i<2,side=i%2?1:-1; m.position.set(x+side*8,y+17+(outer?9:5),3);m.scale.set(outer?11:5,(outer?32:23)*(this.reduced?1:.8+Math.sin(t*43+i)*.2),1);m.material.opacity=outer?.38:.85;m.visible=this.player.visible;}
  this.focus.visible=!!p?.focus;this.hitDot.visible=!!p?.focus;if(p?.focus){this.focus.position.set(x,y,8);this.focus.rotation.z=this.reduced?0:t*.65;this.focus.material.opacity=.65;this.hitDot.position.set(x,y,9);const hitR=game.ship?.hitR||p.hitR||4;this.hitDot.scale.set(hitR*2,hitR*2,1);}
  this.shield.visible=!!(p?.shield||p?.driveTime>0);const shieldMap=p?.shield?this.barrier:this.ring;if(this.shield.material.map!==shieldMap){this.shield.material.map=shieldMap;this.shield.material.needsUpdate=true;}this.shield.material.color.set(p?.shield?0x9cd4ff:0x97ffe1);this.shield.position.set(x,y,6);this.shield.rotation.z=this.reduced?0:t*.3;this.shield.material.opacity=p?.shield?.8:p?.driveTime>0?.45:.3;
  let ti=0;for(const turret of game?.turrets||[]){const m=this.pooled(this.turretSprites,ti++,this.shipTextures[3],26,26,4,0x96ffe0);m.position.set(turret.x,turret.y,4);m.material.opacity=clamp((turret.life-turret.age)*2,0,1);}this.hideTail(this.turretSprites,ti);
  const count=clamp(Number(p?.options)||0,0,8);for(let i=0;i<count;i++){const side=i%2?1:-1,n=Math.floor(i/2)+1,ox=x+side*(p.focus?20+n*8:23+n*13),oy=y+6+n*7;const m=this.pooled(this.optionSprites,i,this.shipTextures[(id+4)%8],22,22,4,0xc3fff0);m.position.set(ox,oy,4);m.rotation.z=side*.16;}
  this.hideTail(this.optionSprites,count);
  const orbit=orbitPositions(p||{},game?.time||0);for(let i=0;i<orbit.length;i++){const pos=orbit[i],m=this.pooled(this.orbitSprites,i,this.shipTextures[3],32,32,6,0xd6b5ff);m.position.set(pos.x,pos.y,6);m.rotation.z=pos.angle+Math.PI/2;}this.hideTail(this.orbitSprites,orbit.length);

 }
 drawEnemies(game,t){
  const enemies=game?.enemies||[];let n=0,parts=0,hps=0;
  for(const e of enemies){if(e.hp<=0)continue;const boss=e.boss||e.mid,r=e.r||18,size=boss?r*2.65:r*3.05;const m=this.pooled(this.enemySprites,n++,boss?this.bossTextures[e.secret?5:(game.stage||0)%6]:this.enemyTextures[(e.type||0)%12],size,size,boss?2:3);m.position.set(e.x,e.y,boss?2:3);m.rotation.z=this.reduced?0:boss?Math.sin(t*.65)*.035:Math.sin((e.age||0)*2+e.id)*.08;
   if(!boss&&e.hp<e.maxHp){const b=this.pooled(this.hpSprites,hps++,null,r*1.8,2,8,0x13252b);b.position.set(e.x,e.y-r-9,8);const f=this.pooled(this.hpSprites,hps++,null,r*1.8*clamp(e.hp/e.maxHp,0,1),2,9,0xefa983);f.position.set(e.x-r*.9+f.scale.x*.5,e.y-r-9,9);}
   for(const part of e.parts||[]){if(part.dead)continue;const px=part.x,py=part.y;const p=this.pooled(this.partSprites,parts++,this.enemyTextures[10],boss?32:22,boss?32:22,5,0xffd7b0);p.position.set(px,py,5);p.rotation.z=this.reduced?0:Math.sin(t+parts)*.08;const bar=this.pooled(this.hpSprites,hps++,null,23*clamp(part.hp/part.maxHp,0,1),1.5,9,0xffd899);bar.position.set(px,py+19,9);}
  }
  this.hideTail(this.enemySprites,n);this.hideTail(this.partSprites,parts);this.hideTail(this.hpSprites,hps);
 }
 drawBullets(game,alpha){
  const pool=game?.bullets;let enemy=0,ally=0;if(pool){const hostileColors=[0xff729e,0xffae6e,0xd292ff,0xffd27d,0xff81a9,0xeba2ff];const friendlyColors=[0x8dffe0,0xb7f8ff,0xd4ffe4,0xc1f7b1];for(let i=0;i<pool.capacity;i++){if(!pool.active[i])continue;const friendly=pool.owner[i]===1,mesh=friendly?this.allyBullets:this.enemyBullets,j=friendly?ally:enemy;if(j>=mesh.instanceMatrix.count)continue;const a=clamp(alpha,0,1),x=Number.isFinite(pool.px?.[i])?pool.px[i]+(pool.x[i]-pool.px[i])*a:pool.x[i],y=Number.isFinite(pool.py?.[i])?pool.py[i]+(pool.y[i]-pool.py[i])*a:pool.y[i],r=Math.max(friendly?1.6:2.8,pool.r[i]||3),kind=Math.abs(pool.kind[i]||0),speed=Math.hypot(pool.vx[i],pool.vy[i]);let w=r*2.8,h=r*2.8,shape=kind%9===3?2:kind%7===4?3:0;if(friendly){w=Math.max(4,r*2.4);h=Math.max(13,Math.min(38,speed*.065));shape=0;}else if(kind%4===1){w=r*2;h=r*4.1;}this.instance(mesh,j,x,y,w,h,Math.atan2(pool.vy[i],pool.vx[i])-Math.PI/2,friendly?(kind===21?0xffd889:kind===22?0xc6a4ff:friendlyColors[kind%4]):hostileColors[kind%6],shape);if(friendly)ally++;else enemy++;}}
  this.finish(this.enemyBullets,enemy);this.finish(this.allyBullets,ally);
 }
 itemTexture(type){
  this.itemTextures??=new Map();if(this.itemTextures.has(type))return this.itemTextures.get(type);
  const info=ITEM_UI[type]||ITEM_UI['?'],c=canvas(160,184),g=c.getContext('2d'),col=info.color;
  g.shadowColor='#000';g.shadowBlur=12;g.shadowOffsetY=4;g.fillStyle='#061b20';g.beginPath();g.roundRect(12,9,136,163,25);g.fill();g.shadowBlur=0;g.shadowOffsetY=0;
  g.strokeStyle=col;g.lineWidth=4;g.stroke();g.fillStyle=col+'25';g.beginPath();g.roundRect(20,17,120,93,18);g.fill();
  g.fillStyle=col;g.font='bold 62px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(info.symbol,80,65);
  g.fillStyle='#f3faf6';g.font='bold 40px system-ui,sans-serif';g.fillText(info.label,80,140);
  const tex=texture(c);this.itemTextures.set(type,tex);return tex;
 }
 drawItems(game,t){const items=game?.items||[];let i=0;for(const item of items){const m=this.pooled(this.itemSprites,i++,this.itemTexture(item.type),56,64,6);m.position.set(item.x,item.y,6);m.rotation.z=0;}this.hideTail(this.itemSprites,i);}
 drawHazards(game,t){let i=0;for(const h of game?.hazards||[]){const warn=h.age<h.warn,angle=h.angle||0,length=h.length||850,width=warn?Math.max(1,(h.width||12)*.12):(h.width||12);const x=h.x+Math.cos(angle)*length*.5,y=h.y+Math.sin(angle)*length*.5;
  const halo=this.pooled(this.hazardSprites,i++,this.soft,length,width*(warn?5:3),warn?1:7,h.owner===1?0x79ffdc:warn?0xffb779:0xff719b);halo.position.set(x,y,warn?1:7);halo.rotation.z=angle;halo.material.opacity=warn?(this.reduced?.25:.16+Math.sin(t*12)*.08):.68;
  const core=this.pooled(this.hazardSprites,i++,null,length,width,warn?2:8,h.owner===1?0xd6fff1:warn?0xffad87:0xffd5e3);core.position.set(x,y,warn?2:8);core.rotation.z=angle;core.material.opacity=warn?.4:.9;
 }this.hideTail(this.hazardSprites,i);}
 updateEffects(dt){
  let beam=0;for(let i=this.effects.length-1;i>=0;i--){const effect=this.effects[i];effect.life-=dt;if(effect.life<=0){this.effects.splice(i,1);continue;}for(let j=1;j<effect.points.length;j++){const [ax,ay]=effect.points[j-1],[bx,by]=effect.points[j],length=Math.hypot(bx-ax,by-ay),m=this.pooled(this.beamSprites,beam++,this.soft,length+7,9,7,0xaaffeb);m.position.set((ax+bx)*.5,(ay+by)*.5,7);m.rotation.z=Math.atan2(by-ay,bx-ax);m.material.opacity=effect.life/.14;}}this.hideTail(this.beamSprites,beam);
  let count=0;for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*1.6;p.vy*=1-dt*1.6;const a=p.life/p.maxLife;this.color.set(p.color).multiplyScalar(a);this.instance(this.particleMesh,count++,p.x,p.y,p.size*(.4+a),p.size*(this.reduced?1:2+a*2),Math.atan2(p.vy,p.vx)-Math.PI/2,this.color,0);}
  this.finish(this.particleMesh,count);
  for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.age+=dt;if(r.age>r.life){if(r.mesh){this.scene.remove(r.mesh);r.mesh.material.dispose();}this.rings.splice(i,1);continue;}if(!r.mesh)r.mesh=this.sprite(this.ring,1,1,11,r.color,THREE.AdditiveBlending);const a=r.age/r.life,size=this.reduced?r.size*.55:10+r.size*(1-Math.pow(1-a,2));r.mesh.position.set(r.x,r.y,11);r.mesh.scale.set(size,size,1);r.mesh.material.opacity=(1-a)*.75;}
 }
 drawHUD(game,t,dt){
  this.warning=Math.max(0,this.warning-dt);this.flash=Math.max(0,this.flash-dt*.8);
  this.flashMesh.visible=this.flash>0&&!this.reduced;this.flashMesh.material.opacity=this.flash;
  const boss=game?.boss||game?.enemies?.find(e=>e.boss||e.mid),player=game?.player;
  const key=[!!game,game?.stats?.combo,boss?.id,Math.ceil(boss?.hp||0),boss?.maxHp,player?.hp,player?.maxHp,Math.floor(player?.drive||0),Math.ceil(this.warning*20),this.warningText].join(':');
  if(key===this.hudKey)return;this.hudKey=key;
  const g=this.hudCanvas.getContext('2d');g.clearRect(0,0,960,1440);g.save();g.scale(2,2);const gradient=g.createLinearGradient(0,0,0,100);gradient.addColorStop(0,'#03151dbb');gradient.addColorStop(1,'transparent');g.fillStyle=gradient;g.fillRect(0,0,480,100);
  // Fine illuminated cockpit frame leaves the center of the action clear.
  g.strokeStyle='#96e5cf55';g.lineWidth=.6;g.beginPath();g.moveTo(9,62);g.lineTo(9,9);g.lineTo(62,9);g.moveTo(418,9);g.lineTo(471,9);g.lineTo(471,62);g.moveTo(9,658);g.lineTo(9,711);g.lineTo(62,711);g.moveTo(418,711);g.lineTo(471,711);g.lineTo(471,658);g.stroke();
  if(game){
   const p=game.player,boss=game.boss||game.enemies?.find(e=>e.boss||e.mid);
   if(boss&&boss.hp>0){const ratio=clamp(boss.hp/boss.maxHp,0,1);g.fillStyle='#03151dde';g.fillRect(58,43,364,31);g.fillStyle='#e9d8c3';g.font='9px monospace';g.fillText(boss.mid?'高脅威反応 / 中間指揮機':'高脅威反応 / 中枢守護機',65,54);g.textAlign='right';g.fillStyle='#ffb59f';g.fillText(`${Math.ceil(ratio*100)}%`,415,54);g.textAlign='left';g.fillStyle='#55353d';g.fillRect(65,61,350,4);g.fillStyle='#ffaa9c';g.fillRect(65,61,350*ratio,4);for(let j=1;j<10;j++)g.clearRect(65+j*35,61,1,4);}
   const combo=game.stats?.combo||0;if(combo>=10){g.font='italic 19px sans-serif';g.textAlign='right';g.fillStyle='#e4f8dc';g.fillText(`${combo}`,462,103);g.font='7px monospace';g.fillStyle='#8cbeaf';g.fillText('CHAIN',461,115);g.textAlign='left';}
  }else{g.font='9px monospace';g.fillStyle='#b2d7c288';g.fillText('ORBITAL DEFENSE SYSTEM',22,33);g.textAlign='right';g.fillText('IDLE / AWAITING PILOT',458,691);g.textAlign='left';}
  if(this.warning>0){
   g.globalAlpha=Math.min(1,this.warning*2);g.fillStyle='#081e20f2';g.strokeStyle=this.warningBoss?'#ffb19c':'#90eec7';g.lineWidth=1.2;g.beginPath();g.roundRect(55,245,370,60,12);g.fill();g.stroke();g.textAlign='center';g.font='bold 14px system-ui,sans-serif';g.fillStyle=this.warningBoss?'#ffc6b4':'#a6f4cf';g.fillText(this.warningBoss?'大型機接近':'航路情報',240,267);g.font='12px system-ui,sans-serif';g.fillStyle='#e1eee5';g.fillText(this.warningText||'戦闘態勢へ',240,289,340);g.textAlign='left';g.globalAlpha=1;
  }
  g.restore();for(let i=0;i<this.hudRegions.length;i++){const region=this.hudRegions[i];region.mesh.visible=i!==2||this.warning>0;if(!region.mesh.visible)continue;const context=region.canvas.getContext('2d');context.clearRect(0,0,960,region.h*2);context.drawImage(this.hudCanvas,0,region.y*2,960,region.h*2,0,0,960,region.h*2);region.map.needsUpdate=true;}
 }
 destroy(){if(this.dead)return;this.dead=true;this.observer?.disconnect();const textures=new Set([...this.backgrounds,...this.shipTextures,...this.enemyTextures,...this.bossTextures,this.soft,this.ring,this.barrier,...this.hudRegions.map(r=>r.map),...(this.itemTextures?.values()||[])]),materials=new Set(),geometries=new Set();this.scene.traverse(o=>{if(o.material)materials.add(o.material);if(o.geometry)geometries.add(o.geometry);});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.renderer.dispose();this.effects.length=0;this.particles.length=0;this.rings.length=0;}
}
