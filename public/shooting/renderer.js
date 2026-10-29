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
// Original modular hard-surface silhouettes: interceptors, corvettes and reactor carriers.
function hullArt(type,boss=false,player=false){
 const c=canvas(boss?512:256,boss?512:256),g=c.getContext('2d');g.scale(c.width/256,c.width/256);g.translate(128,128);if(!player)g.rotate(Math.PI);
 const family=type%(player?8:6),accent=player?['#8affd5','#99e9ff','#ffd48d','#c6b4ff','#a7d9b9','#82d9ff','#f4afc1','#ffe1a1'][type%8]:['#ff9d87','#e6acff','#ffc883','#ffa2bd','#a4bcff','#ffd9a0'][type%6];
 const metal=g.createLinearGradient(-90,-80,90,90);metal.addColorStop(0,player?'#c8e1da':'#aab5c1');metal.addColorStop(.25,'#6b8391');metal.addColorStop(.48,'#304956');metal.addColorStop(.53,'#7e939a');metal.addColorStop(1,'#172c3e');
 const plate=(pts,fill=metal)=>poly(g,pts,fill,'#a2b4bb',1.2);
 // Shadow printed into the texture, never a full-screen post effect.
 g.shadowColor='#000b';g.shadowBlur=9;g.shadowOffsetY=7;
 const outlines=[[[0,-102],[19,-37],[76,23],[85,69],[24,45],[0,77],[-24,45],[-85,69],[-76,23],[-19,-37]],[[0,-91],[15,-44],[47,-73],[61,-65],[47,21],[33,64],[0,52],[-33,64],[-47,21],[-61,-65],[-47,-73],[-15,-44]],[[0,-74],[25,-46],[88,-28],[95,61],[64,75],[44,28],[22,66],[-22,66],[-44,28],[-64,75],[-95,61],[-88,-28],[-25,-46]],[[0,-102],[17,-49],[34,-21],[38,61],[12,43],[0,83],[-12,43],[-38,61],[-34,-21],[-17,-49]],[[0,-61],[60,-66],[85,-31],[85,60],[60,79],[22,48],[-22,48],[-60,79],[-85,60],[-85,-31],[-60,-66]],[[0,-92],[20,-29],[81,-62],[68,18],[91,62],[29,45],[0,69],[-29,45],[-91,62],[-68,18],[-81,-62],[-20,-29]],[[0,-72],[27,-49],[102,-16],[95,48],[49,73],[22,39],[-22,39],[-49,73],[-95,48],[-102,-16],[-27,-49]],[[0,-106],[24,-42],[55,-66],[87,-34],[63,19],[85,77],[22,48],[0,81],[-22,48],[-85,77],[-63,19],[-87,-34],[-55,-66],[-24,-42]]];
 plate(outlines[family]);g.shadowBlur=0;g.shadowOffsetY=0;
 for(const side of [-1,1]){
  const wide=[67,40,73,28,66,65,80,65][family];
  plate([[side*22,-22],[side*wide,-8],[side*(wide+3),40],[side*37,37]],'#1b3545');
  plate([[side*27,-14],[side*(wide-9),0],[side*(wide-6),22],[side*30,11]],'#577780');
  line(g,side*27,18,side*(wide-3),30,accent,2);
  // Recessed intake louvers, copper service lines and embedded running lamps.
  for(let j=0;j<5;j++)line(g,side*37,j*6-7,side*(wide-9),j*6+1,'#071d2b',2.5);
  line(g,side*23,7,side*23,39,'#aa8969',1);
  g.fillStyle='#061724';g.fillRect(side*25-6,-47,12,35);g.fillStyle='#c9d4c9';g.fillRect(side*25-2,-52,4,24);
  g.fillStyle='#0a1924';g.fillRect(side*25-9,40,18,21);g.fillStyle=accent;g.fillRect(side*25-5,49,10,7);glow(g,side*25,59,15,accent+'88');
  g.fillStyle=accent;g.fillRect(side*(wide-3)-2,30,4,6);
  for(let j=0;j<4;j++){g.fillStyle='#d0d7c7';g.fillRect(side*(34+j*6),35+j%2*3,1.5,1.5);}
 }
 plate([[-9,-78],[0,-96],[9,-78],[16,-22],[10,44],[0,58],[-10,44],[-16,-22]]);
 plate([[0,-68],[7,-44],[6,-15],[0,-6],[-6,-15],[-7,-44]],'#071e2a');glow(g,0,-34,17,accent+'66');poly(g,[[0,-61],[4,-42],[3,-20],[0,-15],[-3,-20],[-4,-42]],accent);
 for(let i=0;i<6;i++)line(g,-8,9+i*5,8,9+i*5,'#152b36',1.5);
 if(boss){
  // Radically wider capital hulls, distinct armor contours per stage.
  for(const side of [-1,1]){const spread=family%2?109:100;
   plate([[side*18,-51],[side*61,-96],[side*spread,-67],[side*117,35],[side*92,91],[side*58,70],[side*42,12]]);
   plate([[side*51,-40],[side*78,-70],[side*96,-50],[side*100,34],[side*79,65],[side*60,43]],'#233e50');
   for(let j=0;j<7;j++)line(g,side*65,-34+j*10,side*90,-26+j*10,'#71808a',2);
   g.fillStyle='#061725';g.beginPath();g.arc(side*78,13,19,0,TAU);g.fill();g.strokeStyle=accent;g.lineWidth=3;g.stroke();glow(g,side*78,13,23,accent+'88');g.fillStyle=accent;g.beginPath();g.arc(side*78,13,8,0,TAU);g.fill();
   plate([[side*62,44],[side*88,44],[side*91,89],[side*70,92]],'#152e3d');line(g,side*77,56,side*80,86,'#d5c8a5',6);
   for(let j=0;j<6;j++){g.fillStyle=j%2?'#182e3d':accent;g.fillRect(side*95-3,-46+j*9,6,3);}
  }
  plate([[-27,-73],[0,-112],[27,-73],[33,-7],[0,33],[-33,-7]],'#8e9eaa');plate([[0,-78],[17,-48],[14,-12],[0,5],[-14,-12],[-17,-48]],'#0c2333');glow(g,0,-31,30,accent+'aa');g.fillStyle=accent;g.beginPath();g.arc(0,-31,10,0,TAU);g.fill();
 }
 // Squadron insignia, serial bars and non-random chipped panel edges.
 g.fillStyle=accent;g.font='bold 9px monospace';g.textAlign='center';g.fillText(String(type+1).padStart(2,'0'),0,38);
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
 }else if(stage===1){ // Residual-echo factory: furnaces, pressure vessels and production rails.
  for(let y=0;y<2880;y+=330)for(const side of [0,1]){g.save();if(side){g.translate(960,0);g.scale(-1,1);}poly(g,[[0,y],[172,y],[212,y+59],[196,y+260],[0,y+283]],'#283344','#6f6c75',3);g.fillStyle='#101b2a';g.fillRect(18,y+20,139,237);for(let j=0;j<5;j++){g.fillStyle='#59616c';g.beginPath();g.ellipse(86,y+48+j*42,55,16,0,0,TAU);g.fill();g.fillStyle='#26384b';g.fillRect(31,y+48+j*42,110,26);line(g,39,y+58+j*42,131,y+58+j*42,'#999586',2);}glow(g,182,y+170,60,'#e7a45488');g.fillStyle='#eaa65e';g.fillRect(177,y+131,8,62);for(let j=0;j<4;j++)line(g,21+j*42,y+286,21+j*42,y+323,'#414c5c',8);g.restore();}
  for(let y=80;y<2880;y+=660){line(g,208,y,752,y,'#485363',10);line(g,208,y+6,752,y+6,'#a2917555',2);}
 }else if(stage===2){ // Sky fortress: cloud banks beneath suspended citadels.
  for(let i=0;i<65;i++){const x=r()*960,y=r()*2880;glow(g,x,y,75+r()*160,'#a4c7df22');glow(g,x+60,y+18,50+r()*80,'#9bbed01a');}
  for(let y=100;y<2880;y+=490)for(const side of [0,1]){g.save();if(side){g.translate(960,0);g.scale(-1,1);}poly(g,[[0,y-70],[142,y-70],[218,y],[185,y+180],[115,y+239],[0,y+210]],'#3f5267','#8da8ba',3);poly(g,[[0,y-49],[125,y-49],[182,y+7],[154,y+149],[0,y+174]],'#233c51','#5e8095',2);for(let j=0;j<4;j++){line(g,20+j*35,y-19,20+j*35,y+120,'#7c9bae',4);g.fillStyle='#c4e0de';g.fillRect(28+j*35,y+8,5,34);}poly(g,[[89,y+170],[144,y+172],[114,y+221]],'#7497a6');glow(g,117,y+225,33,'#9ff0ff66');g.restore();}
 }else if(stage===3){ // Star-sea front: deep space, a planet limb and orbital wreckage.
  glow(g,780,1340,580,'#7271ae55');g.fillStyle='#314667';g.beginPath();g.arc(1100,1380,540,0,TAU);g.fill();g.strokeStyle='#91badd66';g.lineWidth=13;g.stroke();g.fillStyle='#17263f';g.beginPath();g.arc(1140,1395,525,0,TAU);g.fill();
  for(let i=0;i<25;i++){const x=i%2?r()*140:820+r()*140,y=r()*2880,z=15+r()*44;g.save();g.translate(x,y);g.rotate(r()*TAU);poly(g,[[-z,-z*.5],[z*.7,-z],[z,z*.5],[-z*.6,z]],'#3b465e','#74798c',2);line(g,-z*.7,0,z*.7,0,'#17283d',4);g.restore();}
  g.save();g.translate(40,2000);g.rotate(-.4);for(let i=0;i<3;i++){g.strokeStyle=['#2c3f57','#6c7f96','#334d63'][i];g.lineWidth=14-i*4;g.beginPath();g.ellipse(0,0,260+i*20,490+i*20,0,0,TAU);g.stroke();}g.restore();
 }else{ // Solar fortress (and a violet mirror world for the secret stage).
  for(let y=0;y<2880;y+=210){for(let side=0;side<2;side++){g.save();if(side){g.translate(960,0);g.scale(-1,1);}poly(g,[[0,y],[165,y],[235,y+66],[186,y+160],[0,y+187]],stage===5?'#392940':'#3a3429',p[3]+'66',2);poly(g,[[12,y+14],[147,y+14],[203,y+68],[164,y+138],[12,y+161]],p[0],p[3]+'44');for(let j=0;j<6;j++)line(g,27+j*22,y+30,27+j*22,y+115,p[3]+'44',2);g.fillStyle=p[2];g.globalAlpha=.5;g.fillRect(170,y+69,11,25);g.globalAlpha=1;g.restore();}}
  for(let i=0;i<10;i++){g.strokeStyle=p[2]+'15';g.lineWidth=2;g.beginPath();g.arc(480,280+i*380,200+i%3*55,0,TAU);g.stroke();}
 }
 // Tiny navigation lights and suspended dust unify the original world.
 for(let i=0;i<450;i++){g.globalAlpha=.12+r()*.4;g.fillStyle=i%4?p[2]:'#fff2d6';const z=i%7===0?2:1;g.fillRect(r()*960,r()*2880,z,z);}g.globalAlpha=1;
 const edge=g.createLinearGradient(0,0,960,0);edge.addColorStop(0,'#00000088');edge.addColorStop(.24,'transparent');edge.addColorStop(.76,'transparent');edge.addColorStop(1,'#00000088');g.fillStyle=edge;g.fillRect(0,0,960,2880);
 return texture(c);
}
function smokeTexture(){const c=canvas(128,128),g=c.getContext('2d'),r=rng(218);for(let i=0;i<20;i++)glow(g,38+r()*50,38+r()*50,18+r()*24,'#d6c6b426');return texture(c);}
function debrisTexture(){const c=canvas(64,64),g=c.getContext('2d');poly(g,[[8,12],[49,17],[56,45],[20,50]],'#718491','#bdc1b5',2);poly(g,[[11,16],[47,21],[28,29]],'#d2d3bc');line(g,19,37,47,31,'#243c49',5);return texture(c);}
function sceneryArt(stage){const c=canvas(256,512),g=c.getContext('2d'),p=palettes[stage];g.shadowColor='#000';g.shadowBlur=14;g.shadowOffsetX=10;poly(g,[[40,18],[170,18],[217,74],[217,454],[164,492],[40,492]],'#0a1c29','#41616a',3);g.shadowBlur=0;g.shadowOffsetX=0;for(let i=0;i<7;i++){poly(g,[[54,43+i*61],[161,43+i*61],[192,68+i*61],[192,87+i*61],[54,87+i*61]],stage===2?'#526c7c':'#25444d','#55747b',2);g.fillStyle='#091e2d';g.fillRect(65,51+i*61,83,14);line(g,69,77+i*61,145,77+i*61,p[2]+'99',2);}g.fillStyle=p[3];g.fillRect(199,110,4,47);g.fillRect(199,345,4,47);return texture(c);}
function softTexture(){const c=canvas(128,128),g=c.getContext('2d');glow(g,64,64,63,'#ffffff');return texture(c);}
function barrierTexture(){const c=canvas(256,256),g=c.getContext('2d');const points=Array.from({length:6},(_,i)=>[128+Math.cos(i*TAU/6)*108,128+Math.sin(i*TAU/6)*108]);poly(g,points,'#74bfff14','#c4e6ff',5);g.strokeStyle='#85caff66';g.lineWidth=1;g.beginPath();g.arc(128,128,94,0,TAU);g.stroke();return texture(c);}
function ringTexture(){const c=canvas(256,256),g=c.getContext('2d');g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(128,128,111,0,TAU);g.stroke();g.strokeStyle='#ffffff55';g.lineWidth=1;g.beginPath();g.arc(128,128,104,0,TAU);g.stroke();for(let i=0;i<12;i++){const a=i/12*TAU;line(g,128+Math.cos(a)*99,128+Math.sin(a)*99,128+Math.cos(a)*114,128+Math.sin(a)*114,'#fff',3);}return texture(c);}
const previewCache=new Map();
export function shipPreview(id){if(!previewCache.has(id)){const map=hullArt(id,false,true);previewCache.set(id,map.image.toDataURL('image/png'));map.dispose();}return previewCache.get(id);}
const bulletVertex=`attribute float aKind; varying vec2 vUv; varying vec3 vColor; varying float vKind; void main(){vUv=uv;vColor=instanceColor;vKind=aKind;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const bulletFragment=`precision highp float; varying vec2 vUv; varying vec3 vColor; varying float vKind; void main(){vec2 p=(vUv-.5)*2.;float d=length(p);bool hostile=vKind>9.;float shape=hostile?vKind-10.:vKind;float a=1.-smoothstep(.68,1.,d);float core=1.-smoothstep(.18,.57,d);float rim=exp(-pow((d-.57)*10.,2.));vec3 col=mix(vColor,vColor*.45+vec3(.65),core*.85);if(shape>1.5&&shape<2.5){a*=smoothstep(.27,.44,d);col+=rim*.25;}if(shape>2.5&&shape<3.5){float diamond=abs(p.x)+abs(p.y);a=1.-smoothstep(.65,1.,diamond);core=1.-smoothstep(.0,.5,diamond);col=mix(vColor,vec3(1.),core*.9);}if(shape>3.5&&shape<4.5){a=(1.-smoothstep(.62,1.,abs(p.x)))*(1.-smoothstep(.65,1.,abs(p.y)));col=mix(vColor,vec3(1.),(1.-abs(p.x))*.85);}
if(shape>4.5&&shape<5.5){float crescent=abs(length(vec2(p.x,p.y*1.5)+vec2(0.,.7))-.8);a=1.-smoothstep(.1,.3,crescent);col=mix(vColor,vec3(1.),.6);}
if(shape>5.5){float body=abs(p.x)*.65+abs(p.y);a=1.-smoothstep(.6,.95,body);col=mix(vColor,vec3(1.),max(0.,1.-abs(p.x)*3.)*.8);}
if(hostile)col=mix(col,vec3(.025,.02,.035),smoothstep(.68,.89,d));if(a<.015)discard;gl_FragColor=vec4(col,a);}`;

export class ShootingRenderer {
 constructor(target,{quality='high',reduced=false}={}){
  this.effectSettings={shake:true,flash:true,particleAmount:1};this.canvas=target;this.quality=quality;this.reduced=!!reduced;this.dead=false;this.time=0;this.last=performance.now();this.stage=-1;this.effects=[];this.rings=[];this.particles=[];this.sequences=[];this.smokes=[];this.smokeSprites=[];this.damageSprites=[];this.engineSprites=[];this.muzzleSprites=[];this.shake=0;this.flash=0;this.warning=0;
  this.renderer=new THREE.WebGLRenderer({canvas:target,antialias:false,alpha:false,powerPreference:'high-performance'});this.renderer.setClearColor(0x061a22,1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,W,0,H,-100,100);this.camera.position.z=50;
  this.geometry=new THREE.PlaneGeometry(1,1);this.resources=[];this.color=new THREE.Color();this.matrix=new THREE.Matrix4();this.position=new THREE.Vector3();this.scale=new THREE.Vector3();this.quat=new THREE.Quaternion();this.axis=new THREE.Vector3(0,0,1);
  this.backgrounds=Array.from({length:6},(_,i)=>backgroundArt(i));this.shipTextures=Array.from({length:8},(_,i)=>hullArt(i,false,true));this.enemyTextures=Array.from({length:12},(_,i)=>hullArt(i));this.bossTextures=Array.from({length:6},(_,i)=>hullArt(i,true));this.soft=softTexture();this.smoke=smokeTexture();this.debris=debrisTexture();this.debrisSprites=[];this.fragments=[];this.muzzles=[];this.ring=ringTexture();this.barrier=barrierTexture();
  this.bgMeshes=[this.sprite(this.backgrounds[0],480,1440,-20),this.sprite(this.backgrounds[0],480,1440,-20)];this.bgMeshes.forEach(m=>m.material.transparent=false);
  this.paintedTextures=Array(6).fill(null);this.paintedFailures=[];this.paintedMeshes=[this.sprite(null,480,820,-17)];this.paintedMeshes.forEach(m=>{m.visible=false;m.material.color.set(0xb9ced0);});
  const artLoader=new THREE.TextureLoader();for(let i=0;i<6;i++)artLoader.load(new URL(`./art/stage-${i}.webp`,import.meta.url).href,map=>{if(this.dead){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearFilter;map.flipY=false;this.paintedTextures[i]=map;},undefined,()=>{if(!this.dead)this.paintedFailures.push(i);});
  this.sceneryTextures=Array.from({length:6},(_,i)=>sceneryArt(i));this.scenery=Array.from({length:4},(_,i)=>this.sprite(this.sceneryTextures[0],90,200,-8));this.stars=this.createStars();this.bossPhases=new WeakMap();this.enemySprites=[];this.partSprites=[];this.hpSprites=[];this.itemSprites=[];this.optionSprites=[];this.orbitSprites=[];this.hazardSprites=[];this.turretSprites=[];this.beamSprites=[];
  this.playerGlow=this.sprite(this.soft,90,90,0,0x63f8d3,THREE.AdditiveBlending);this.player=this.sprite(this.shipTextures[0],72,72,5);this.thrusts=Array.from({length:4},()=>this.sprite(this.soft,16,38,3,0x63ffde,THREE.AdditiveBlending));
  this.focus=this.sprite(this.ring,34,34,8,0x8affdd);this.hitDot=this.sprite(this.soft,9,9,9,0xffffff);this.shield=this.sprite(this.ring,74,74,6,0x97ffe1,THREE.AdditiveBlending);this.shield.visible=false;this.focus.visible=false;this.hitDot.visible=false;
  this.enemyBullets=this.bulletMesh(16384,24);this.allyBullets=this.bulletMesh(8192,4);this.particleMesh=this.bulletMesh(1800,12);this.particleMesh.material.blending=THREE.AdditiveBlending;
  // Only upload/cover HUD regions. Most of the playfield stays free of a
  // full-screen transparent canvas pass, especially important on mobile GPUs.
  this.hudCanvas=canvas(960,1440);this.hudRegions=[[0,150],[640,80],[235,70]].map(([y,h])=>{const c=canvas(960,h*2),map=texture(c),mesh=this.sprite(map,480,h,30);mesh.position.set(240,y+h*.5,30);return{y,h,canvas:c,map,mesh};});
  this.flashMesh=this.solid(480,720,20,0xc7ffeb);this.flashMesh.position.set(240,360,20);this.flashMesh.visible=false;
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
 setEffects({shake=true,flash=true,particleAmount=1}={}){
  this.effectSettings={shake:shake!==false,flash:flash!==false,particleAmount:[0,.5,1].includes(particleAmount)?particleAmount:1};
  if(!this.effectSettings.shake){this.shake=0;this.camera.position.set(0,0,50);}
  if(!this.effectSettings.flash){this.flash=0;this.flashMesh.visible=false;}
  if(this.effectSettings.particleAmount===0){for(const list of [this.particles,this.smokes,this.fragments,this.muzzles])list.length=0;this.particleMesh.count=0;for(const list of [this.smokeSprites,this.debrisSprites,this.muzzleSprites])this.hideTail(list,0);}
 }
 clearPresentation(){
  for(const ring of this.rings)if(ring.mesh){this.scene.remove(ring.mesh);ring.mesh.material.dispose();}
  for(const list of [this.effects,this.rings,this.particles,this.sequences,this.smokes,this.fragments,this.muzzles])list.length=0;
  for(const list of [this.smokeSprites,this.debrisSprites,this.beamSprites,this.muzzleSprites,this.damageSprites,this.engineSprites,this.enemySprites,this.partSprites,this.hpSprites,this.itemSprites,this.hazardSprites,this.optionSprites,this.orbitSprites,this.turretSprites])this.hideTail(list,0);
  for(const mesh of [this.particleMesh,this.enemyBullets,this.allyBullets])mesh.count=0;
  this.shake=0;this.flash=0;this.warning=0;this.warningText='';this.flashMesh.visible=false;this.camera.position.set(0,0,50);this.bossPhases=new WeakMap();this.hudKey='';this.last=performance.now();
 }
 setQuality(value){this.quality=value==='low'?'low':'high';this.resize();}
 setReduced(value){this.reduced=!!value;this.shake=0;this.flash=0;if(this.reduced){this.smokes.length=0;this.fragments.splice(8);this.particles.splice(120);}}
 resize(){if(this.dead)return;const rect=this.canvas.getBoundingClientRect();const width=Math.max(1,Math.round(rect.width||480)),height=Math.max(1,Math.round(rect.height||720));this.renderer.setPixelRatio(this.quality==='low'?1:Math.min(window.devicePixelRatio||1,2));this.renderer.setSize(width,height,false);}
 event(e){
  if(!e||this.dead)return;const x=Number.isFinite(e.x)?e.x:240,y=Number.isFinite(e.y)?e.y:300;const type=e.type;
  if(type==='warning'||type==='boss'){if(type==='warning'&&(!e.text||e.text==='照射予告'))return;this.warning=3.2;this.warningText=e.text||'高エネルギー反応 · 戦闘態勢へ';this.warningBoss=type==='boss';return;}
  if(type==='chain'&&Number.isFinite(e.fromX)&&Number.isFinite(e.fromY)){const points=[[e.fromX,e.fromY]];for(let j=1;j<5;j++)points.push([e.fromX+(x-e.fromX)*j/5+(Math.random()-.5)*16,e.fromY+(y-e.fromY)*j/5+(Math.random()-.5)*12]);points.push([x,y]);this.effects.push({points,life:.14});if(this.effects.length>48)this.effects.shift();return;}
  if(type==='shot'){if(this.effectSettings.particleAmount>0&&this.muzzles.length<12)this.muzzles.push({x,y:y-23,life:.06,maxLife:.06,color:[0x7affe0,0xc4eeff,0xffd18b,0xaeeaff][(e.weapon||0)%4]});return;}
  if(type==='bomb'){this.sequences.push({x,y,age:0,next:0,kind:'bomb'});if(this.sequences.length>12)this.sequences.shift();return;}
  if(type==='explosion'&&e.boss){this.sequences.push({x,y,age:0,next:0,kind:'boss'});if(this.sequences.length>12)this.sequences.shift();this.burst(x,y,90,true);return;}
  if(type==='item'){for(let i=0;i<Math.round((this.reduced?4:14)*this.effectSettings.particleAmount);i++){const a=i/14*TAU,r=50;this.particles.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,vx:-Math.cos(a)*140,vy:-Math.sin(a)*140,life:.32,maxLife:.32,size:3,color:0xffe3a0});}this.rings.push({x,y,age:0,life:.35,size:65,color:0xffe3a0,mesh:null});if(this.particles.length>1700)this.particles.splice(0,this.particles.length-1700);return;}
  if(type==='explosion'||type==='part')this.burst(x,y,type==='part'?38:65,false);

  const big=['bomb','special','overdrive','clear','gameover'].includes(type)||type==='explosion'&&e.boss,explosive=['explosion','part'].includes(type),color=type==='missile'||type==='laser'||type==='graze'?0x9affd7:type==='item'||type==='evolve'?0xffe3a0:big?0x75ffe0:type==='hit'?0xffefca:0xffab78;
  const amount=Math.round((this.quality==='low'||this.reduced?(big?28:explosive?14:4):(big?95:explosive?38:type==='graze'?5:9))*this.effectSettings.particleAmount);
  for(let i=0;i<amount;i++){const angle=Math.random()*TAU,speed=(big?110:explosive?65:22)+Math.random()*(big?320:120),life=(big?.6:.24)+Math.random()*.55;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,size:big?3+Math.random()*5:1.5+Math.random()*3,color});}
  if(big||explosive||type==='evolve'){this.rings.push({x,y,age:0,life:big?1:.55,size:big?500:95,color,mesh:null});if(!this.reduced){if(this.effectSettings.shake)this.shake=Math.max(this.shake,big?8:3);if(this.effectSettings.flash)this.flash=Math.max(this.flash,big?.08:.025);}}
  if(this.rings.length>32){for(const r of this.rings.splice(0,this.rings.length-32)){if(r.mesh){this.scene.remove(r.mesh);r.mesh.material.dispose();}}}
  if(this.particles.length>1700)this.particles.splice(0,this.particles.length-1700);
 }
 burst(x,y,size,boss){
  const limit=Math.round((this.quality==='low'||this.reduced?3:boss?14:7)*this.effectSettings.particleAmount);
  for(let j=0;j<limit;j++){const a=Math.random()*TAU,v=35+Math.random()*110;this.fragments.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,angle:a,spin:(Math.random()-.5)*9,age:0,life:1+Math.random()*.7,size:4+Math.random()*(boss?13:7)});}
  if(!this.reduced)for(let j=0;j<Math.round((this.quality==='low'?2:5)*this.effectSettings.particleAmount);j++)this.smokes.push({x:x+(Math.random()-.5)*size*.5,y:y+(Math.random()-.5)*size*.4,age:0,life:1.4+Math.random()*.6,size:size*(.5+Math.random()*.5)});
  this.smokes.splice(0,Math.max(0,this.smokes.length-42));this.fragments.splice(0,Math.max(0,this.fragments.length-90));
 }
 drawScenery(game,t){
  const map=this.paintedTextures[this.stage%6];for(let i=0;i<this.paintedMeshes.length;i++){const m=this.paintedMeshes[i];m.visible=!!map;if(!map)continue;if(m.material.map!==map){m.material.map=map;m.material.needsUpdate=true;}const aspect=map.image.width/map.image.height,h=Math.max(820,500/aspect),w=h*aspect,drift=this.reduced?0:Math.sin((game?.stageTime||t)*.025)*35;m.scale.set(w,h,1);m.position.set(240,360+drift,-17);m.visible=i===0;}
  for(let i=0;i<this.scenery.length;i++){const m=this.scenery[i],side=i%2?-1:1;m.material.map=this.sceneryTextures[this.stage%6];m.position.set(side<0?478:2,((i*237+(this.reduced?0:(game?.stageTime||t)*38))%1050)-140,-8);m.scale.set(96,192,1);m.rotation.z=side*.08;m.material.opacity=this.paintedTextures[this.stage%6]?.32:.62;}}
 render(game,alpha=1){
  if(this.dead)return;const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;this.time+=dt;const t=this.time,stage=game?.stage||0;
  if(stage!==this.stage){this.stage=stage;this.bgMeshes.forEach(m=>m.material.map=this.backgrounds[stage%6]);}
  const scroll=this.reduced?0:(game?game.stageTime*21:t*12)%1440;
  // Two tall, repeating tiles cover the entire viewport while travelling down.
  const base=scroll-720;this.bgMeshes[0].position.set(240,base,-20);this.bgMeshes[1].position.set(240,base+1440,-20);
  let starCount=0;for(const s of this.stars){const y=(s.y+(this.reduced?0:t*(8+s.z*22)))%H;this.instance(this.starMesh,starCount++,s.x,y,s.size,s.size*(1+(this.reduced?0:s.z)),0,stage===1?0xb9a4e0:0x84c7c3); }this.finish(this.starMesh,this.quality==='low'?45:starCount);
  this.drawScenery(game,t);this.drawPlayer(game,t);this.drawEnemies(game,t);this.drawBullets(game,alpha);this.drawItems(game,t);this.drawHazards(game,t);this.updateEffects(dt);this.drawHUD(game,t,dt);
  if(this.reduced||!this.effectSettings.shake){this.camera.position.x=0;this.camera.position.y=0;}else{this.camera.position.x=(Math.random()-.5)*this.shake;this.camera.position.y=(Math.random()-.5)*this.shake;this.shake=Math.max(0,this.shake-dt*24);}
  this.renderer.render(this.scene,this.camera);
 }
 drawPlayer(game,t){
  const p=game?.player,x=p?.x??240,y=p?.y??575,id=game?.options?.ship??0;this.player.material.map=this.shipTextures[id%8];this.player.position.set(x,y,5);this.player.rotation.z=this.reduced?0:game?Math.sin(t*3)*.018:Math.sin(t*.8)*.06;
  this.player.visible=true;this.player.material.opacity=p?.invincible&&Math.floor(t*22)%3===0?.45:1;this.playerGlow.position.set(x,y+4,0);this.playerGlow.material.opacity=p?.focus?.23:.17;this.playerGlow.visible=true;
  for(let i=0;i<4;i++){const m=this.thrusts[i],outer=i<2,side=i%2?1:-1; m.position.set(x+side*10,y+21+(outer?11:6),3);m.scale.set(outer?11:5,(outer?32:23)*(this.reduced?1:.8+Math.sin(t*43+i)*.2),1);m.material.opacity=outer?.38:.85;m.visible=this.player.visible;}
  this.focus.visible=!!p?.focus;this.hitDot.visible=!!p?.focus;if(p?.focus){this.focus.position.set(x,y,8);this.focus.rotation.z=this.reduced?0:t*.65;this.focus.material.opacity=.65;this.hitDot.position.set(x,y,9);const hitR=game.ship?.hitR||p.hitR||4;this.hitDot.scale.set(hitR*2,hitR*2,1);}
  this.shield.visible=!!(p?.shield||p?.driveTime>0);const shieldMap=p?.shield?this.barrier:this.ring;if(this.shield.material.map!==shieldMap){this.shield.material.map=shieldMap;this.shield.material.needsUpdate=true;}this.shield.material.color.set(p?.shield?0x9cd4ff:0x97ffe1);this.shield.position.set(x,y,6);this.shield.rotation.z=this.reduced?0:t*.3;this.shield.material.opacity=p?.shield?.8:p?.driveTime>0?.45:.3;
  let ti=0;for(const turret of game?.turrets||[]){const m=this.pooled(this.turretSprites,ti++,this.shipTextures[3],26,26,4,0x96ffe0);m.position.set(turret.x,turret.y,4);m.material.opacity=clamp((turret.life-turret.age)*2,0,1);}this.hideTail(this.turretSprites,ti);
  const count=clamp(Number(p?.options)||0,0,8);for(let i=0;i<count;i++){const side=i%2?1:-1,n=Math.floor(i/2)+1,ox=x+side*(p.focus?20+n*8:23+n*13),oy=y+6+n*7;const m=this.pooled(this.optionSprites,i,this.shipTextures[(id+4)%8],22,22,4,0xc3fff0);m.position.set(ox,oy,4);m.rotation.z=side*.16;}
  this.hideTail(this.optionSprites,count);
  const orbit=orbitPositions(p||{},game?.time||0);for(let i=0;i<orbit.length;i++){const pos=orbit[i],m=this.pooled(this.orbitSprites,i,this.shipTextures[3],32,32,6,0xd6b5ff);m.position.set(pos.x,pos.y,6);m.rotation.z=pos.angle+Math.PI/2;}this.hideTail(this.orbitSprites,orbit.length);

 }
 drawEnemies(game,t){
  const enemies=game?.enemies||[];let n=0,parts=0,hps=0,engines=0,damage=0;
  for(const e of enemies){if(e.hp<=0)continue;const boss=e.boss||e.mid,r=e.r||18,size=boss?r*2.65:r*3.05;const m=this.pooled(this.enemySprites,n++,boss?this.bossTextures[e.secret?5:(game.stage||0)%6]:this.enemyTextures[(e.type||0)%12],size,size,boss?2:3);m.position.set(e.x,e.y,boss?2:3);m.rotation.z=this.reduced?0:boss?Math.sin(t*.65)*.035:Math.sin((e.age||0)*2+e.id)*.08;
   if(boss){const previous=this.bossPhases.get(e);if(previous!==undefined&&previous!==e.phase)this.rings.push({x:e.x,y:e.y,age:0,life:.8,size:r*4,color:e.phase===2?0xffa06e:0xe0adff,mesh:null});this.bossPhases.set(e,e.phase);}
   const health=clamp(e.hp/e.maxHp,0,1);m.material.color.setRGB(1,.72+health*.28,.66+health*.34);
   for(const side of [-1,1]){const flame=this.pooled(this.engineSprites,engines++,this.soft,boss?12:6,boss?40:20,1,boss?0xffbb82:0xff897a);flame.position.set(e.x+side*r*.33,e.y-r*.78,1);flame.material.opacity=this.reduced?.25:.36+Math.sin(t*35+e.id)*.1;}
   if(boss&&health<.65){for(let j=0;j<(health<.28?4:2);j++){const scar=this.pooled(this.damageSprites,damage++,this.smoke,18+(1-health)*22,28,4,0x1c1720);scar.position.set(e.x+(j%2?1:-1)*r*.7,e.y+(j<2?0:r*.4),4);scar.material.opacity=.8;const fire=this.pooled(this.damageSprites,damage++,this.soft,12,22,5,0xff8a3d);fire.position.set(scar.position.x,scar.position.y,5);fire.material.opacity=this.reduced?.35:.45+Math.sin(t*22+j)*.17;}}
   if(!boss&&e.hp<e.maxHp){const b=this.pooled(this.hpSprites,hps++,null,r*1.8,2,8,0x13252b);b.position.set(e.x,e.y-r-9,8);const f=this.pooled(this.hpSprites,hps++,null,r*1.8*clamp(e.hp/e.maxHp,0,1),2,9,0xefa983);f.position.set(e.x-r*.9+f.scale.x*.5,e.y-r-9,9);}
   for(const part of e.parts||[]){if(part.dead)continue;const px=part.x,py=part.y;const p=this.pooled(this.partSprites,parts++,this.enemyTextures[10],boss?32:22,boss?32:22,5,0xffd7b0);p.position.set(px,py,5);p.rotation.z=this.reduced?0:Math.sin(t+parts)*.08;const bar=this.pooled(this.hpSprites,hps++,null,23*clamp(part.hp/part.maxHp,0,1),1.5,9,0xffd899);bar.position.set(px,py+19,9);}
  }
  this.hideTail(this.engineSprites,engines);this.hideTail(this.damageSprites,damage);this.hideTail(this.enemySprites,n);this.hideTail(this.partSprites,parts);this.hideTail(this.hpSprites,hps);
 }
 drawBullets(game,alpha){
  const pool=game?.bullets;let enemy=0,ally=0;if(pool){const hostileColors=[0xff729e,0xffae6e,0xd292ff,0xffd27d,0xff81a9,0xeba2ff];const friendlyColors=[0x8dffe0,0xb7f8ff,0xd4ffe4,0xc1f7b1];for(let i=0;i<pool.capacity;i++){if(!pool.active[i])continue;const friendly=pool.owner[i]===1,mesh=friendly?this.allyBullets:this.enemyBullets,j=friendly?ally:enemy;if(j>=mesh.instanceMatrix.count)continue;const a=clamp(alpha,0,1),x=Number.isFinite(pool.px?.[i])?pool.px[i]+(pool.x[i]-pool.px[i])*a:pool.x[i],y=Number.isFinite(pool.py?.[i])?pool.py[i]+(pool.y[i]-pool.py[i])*a:pool.y[i],r=Math.max(friendly?1.6:2.8,pool.r[i]||3),kind=Math.abs(pool.kind[i]||0),speed=Math.hypot(pool.vx[i],pool.vy[i]);let w=r*2.8,h=r*2.8,shape=kind%9===3?2:kind%7===4?3:0;if(friendly){w=Math.max(3.5,r*1.5);h=Math.max(13,Math.min(38,speed*.065));shape=[4,4,3,4,4,4,6,6,0,3,6,3,6,5,5,2,4,4,3,0,4,6,3][kind%23];if([8,13,14,15,19].includes(kind)){w=r*3.2;h=r*3.2;}if([4,5].includes(kind)){w=r*1.8;h=kind===5?70:48;}if([6,7,10].includes(kind)){w=r*1.8;h=r*4;}}else if(kind%4===1){w=r*2;h=r*4.1;}this.instance(mesh,j,x,y,w,h,Math.atan2(pool.vy[i],pool.vx[i])-Math.PI/2,friendly?(kind===21?0xffd889:kind===22?0xc6a4ff:friendlyColors[kind%4]):hostileColors[kind%6],friendly?shape:shape+10);if(friendly)ally++;else enemy++;}}
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
  if(this.rings.length>32)for(const r of this.rings.splice(0,this.rings.length-32)){if(r.mesh){this.scene.remove(r.mesh);r.mesh.material.dispose();}}
  for(let i=this.sequences.length-1;i>=0;i--){const q=this.sequences[i];q.age+=dt;if(q.kind==='bomb'){
   if(q.next===0){this.rings.push({x:q.x,y:q.y,age:0,life:.22,size:85,color:0xc6fff3,mesh:null,contract:true});q.next=1;}
   if(q.age>.18&&q.next===1){this.event({type:'special',x:q.x,y:q.y});this.burst(q.x,q.y,180,true);this.rings.push({x:q.x,y:q.y,age:0,life:1.3,size:1050,color:0x94ffe3,mesh:null});q.next=2;}
  }else if(q.age>q.next*.13&&q.next<9){const a=q.next*2.4,r=q.next*8;this.event({type:'part',x:q.x+Math.cos(a)*r,y:q.y+Math.sin(a)*r});q.next++;if(q.next===9){this.event({type:'special',x:q.x,y:q.y});this.rings.push({x:q.x,y:q.y,age:0,life:1.5,size:650,color:0xffd6a6,mesh:null});}}
   if(q.age>2)this.sequences.splice(i,1);
  }
  let smoke=0;for(let i=this.smokes.length-1;i>=0;i--){const p=this.smokes[i];p.age+=dt;if(p.age>p.life){this.smokes.splice(i,1);continue;}const a=p.age/p.life,m=this.pooled(this.smokeSprites,smoke++,this.smoke,p.size*(.5+a),p.size*(.5+a),-1,0x655c62);m.position.set(p.x,p.y-p.age*15,-1);m.rotation.z=p.age*.3;m.material.opacity=Math.sin(a*Math.PI)*.5;}this.hideTail(this.smokeSprites,smoke);
  let debris=0;for(let i=this.fragments.length-1;i>=0;i--){const p=this.fragments[i];p.age+=dt;if(p.age>p.life){this.fragments.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=35*dt;const m=this.pooled(this.debrisSprites,debris++,this.debris,p.size,p.size*.6,3);m.position.set(p.x,p.y,3);m.rotation.z=p.angle+(this.reduced?0:p.age*p.spin);m.material.opacity=Math.min(1,(p.life-p.age)*2);}this.hideTail(this.debrisSprites,debris);
  let muzzle=0;for(let i=this.muzzles.length-1;i>=0;i--){const p=this.muzzles[i];p.life-=dt;if(p.life<=0){this.muzzles.splice(i,1);continue;}const m=this.pooled(this.muzzleSprites,muzzle++,this.soft,20,27,4,p.color);m.position.set(p.x,p.y,4);m.material.opacity=p.life/p.maxLife*.7;}this.hideTail(this.muzzleSprites,muzzle);
  let beam=0;for(let i=this.effects.length-1;i>=0;i--){const effect=this.effects[i];effect.life-=dt;if(effect.life<=0){this.effects.splice(i,1);continue;}for(let j=1;j<effect.points.length;j++){const [ax,ay]=effect.points[j-1],[bx,by]=effect.points[j],length=Math.hypot(bx-ax,by-ay),m=this.pooled(this.beamSprites,beam++,this.soft,length+7,9,7,0xaaffeb);m.position.set((ax+bx)*.5,(ay+by)*.5,7);m.rotation.z=Math.atan2(by-ay,bx-ax);m.material.opacity=effect.life/.14;}}this.hideTail(this.beamSprites,beam);
  let count=0;for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*1.6;p.vy*=1-dt*1.6;const a=p.life/p.maxLife;this.color.set(p.color).multiplyScalar(a);this.instance(this.particleMesh,count++,p.x,p.y,p.size*(.4+a),p.size*(this.reduced?1:2+a*2),Math.atan2(p.vy,p.vx)-Math.PI/2,this.color,0);}
  this.finish(this.particleMesh,count);
  for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.age+=dt;if(r.age>r.life){if(r.mesh){this.scene.remove(r.mesh);r.mesh.material.dispose();}this.rings.splice(i,1);continue;}if(!r.mesh)r.mesh=this.sprite(this.ring,1,1,11,r.color,THREE.AdditiveBlending);const a=r.age/r.life,size=this.reduced?r.size*.55:r.contract?r.size*(1-a):10+r.size*(1-Math.pow(1-a,2));r.mesh.position.set(r.x,r.y,11);r.mesh.scale.set(size,size,1);r.mesh.material.opacity=(1-a)*.75;}
 }
 drawHUD(game,t,dt){
  this.warning=Math.max(0,this.warning-dt);this.flash=Math.max(0,this.flash-dt*.8);
  this.flashMesh.visible=this.flash>0&&!this.reduced&&this.effectSettings.flash;this.flashMesh.material.opacity=this.flash;
  const boss=game?.boss||game?.enemies?.find(e=>e.boss||e.mid),player=game?.player;
  const key=[!!game,game?.stats?.combo,boss?.id,Math.ceil(boss?.hp||0),boss?.maxHp,player?.hp,player?.maxHp,Math.floor(player?.drive||0),Math.ceil(this.warning*20),this.warningText].join(':');
  if(key===this.hudKey)return;this.hudKey=key;
  const g=this.hudCanvas.getContext('2d');g.clearRect(0,0,960,1440);g.save();g.scale(2,2);const gradient=g.createLinearGradient(0,0,0,100);gradient.addColorStop(0,'#03151dbb');gradient.addColorStop(1,'transparent');g.fillStyle=gradient;g.fillRect(0,0,480,100);
  // Fine illuminated cockpit frame leaves the center of the action clear.
  g.strokeStyle='#96e5cf55';g.lineWidth=.6;g.beginPath();g.moveTo(9,62);g.lineTo(9,9);g.lineTo(62,9);g.moveTo(418,9);g.lineTo(471,9);g.lineTo(471,62);g.moveTo(9,658);g.lineTo(9,711);g.lineTo(62,711);g.moveTo(418,711);g.lineTo(471,711);g.lineTo(471,658);g.stroke();
  if(game){
   const p=game.player,boss=game.boss||game.enemies?.find(e=>e.boss||e.mid);
   if(boss&&boss.hp>0){const ratio=clamp(boss.hp/boss.maxHp,0,1);g.fillStyle='#03151dde';g.fillRect(58,43,364,31);g.fillStyle='#e9d8c3';g.font='9px monospace';g.fillText(boss.mid?'高脅威反応 / 中間指揮機':'高脅威反応 / 中枢守護機',65,54);g.textAlign='right';g.fillStyle='#ffb59f';g.fillText(`PHASE ${(boss.phase||0)+1} / ${Math.ceil(ratio*100)}%`,415,54);g.textAlign='left';g.fillStyle='#55353d';g.fillRect(65,61,350,4);g.fillStyle='#ffaa9c';g.fillRect(65,61,350*ratio,4);for(let j=1;j<10;j++)g.clearRect(65+j*35,61,1,4);}
   const combo=game.stats?.combo||0;if(combo>=10){g.font='italic 19px sans-serif';g.textAlign='right';g.fillStyle='#e4f8dc';g.fillText(`${combo}`,462,103);g.font='7px monospace';g.fillStyle='#8cbeaf';g.fillText('CHAIN',461,115);g.textAlign='left';}
  }else{g.font='9px monospace';g.fillStyle='#b2d7c288';g.fillText('ORBITAL DEFENSE SYSTEM',22,33);g.textAlign='right';g.fillText('IDLE / AWAITING PILOT',458,691);g.textAlign='left';}
  if(this.warning>0){
   g.globalAlpha=Math.min(1,this.warning*2);g.fillStyle='#081e20f2';g.strokeStyle=this.warningBoss?'#ffb19c':'#90eec7';g.lineWidth=1.2;g.beginPath();g.roundRect(55,245,370,60,12);g.fill();g.stroke();g.textAlign='center';g.font='bold 14px system-ui,sans-serif';g.fillStyle=this.warningBoss?'#ffc6b4':'#a6f4cf';g.fillText(this.warningBoss?'大型機接近':'航路情報',240,267);g.font='12px system-ui,sans-serif';g.fillStyle='#e1eee5';g.fillText(this.warningText||'戦闘態勢へ',240,289,340);g.textAlign='left';g.globalAlpha=1;
  }
  g.restore();for(let i=0;i<this.hudRegions.length;i++){const region=this.hudRegions[i];region.mesh.visible=i!==2||this.warning>0;if(!region.mesh.visible)continue;const context=region.canvas.getContext('2d');context.clearRect(0,0,960,region.h*2);context.drawImage(this.hudCanvas,0,region.y*2,960,region.h*2,0,0,960,region.h*2);region.map.needsUpdate=true;}
 }
 destroy(){if(this.dead)return;this.dead=true;this.observer?.disconnect();const textures=new Set([...this.backgrounds,...this.paintedTextures.filter(Boolean),...this.shipTextures,...this.enemyTextures,...this.bossTextures,this.soft,this.ring,this.barrier,this.smoke,this.debris,...this.sceneryTextures,...this.hudRegions.map(r=>r.map),...(this.itemTextures?.values()||[])]),materials=new Set(),geometries=new Set();this.scene.traverse(o=>{if(o.material)materials.add(o.material);if(o.geometry)geometries.add(o.geometry);});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.renderer.dispose();this.effects.length=0;this.particles.length=0;this.rings.length=0;}
}
