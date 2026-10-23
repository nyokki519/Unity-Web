import * as THREE from '../../vendor/three/three.module.js';

function lettering(text,{width=1024,height=256,bg='#113c36',color='#f3e7cb',size=90}={}){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,width,height);c.strokeStyle='#bda571';c.lineWidth=4;c.strokeRect(12,12,width-24,height-24);c.fillStyle=color;c.font=`600 ${size}px Georgia, 'Yu Mincho', serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,width/2,height/2,width-48);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function rotorTexture(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#204d37';c.fillRect(0,0,1024,512);
 for(let i=0;i<12;i++){const x=i*85;c.fillStyle=i%2?'#365f3d':'#214f37';c.fillRect(x,0,85,512);c.strokeStyle='#d8b765';c.lineWidth=3;c.strokeRect(x+5,4,75,504);}
 c.textAlign='center';c.fillStyle='#f5d98c';c.font='bold 64px Georgia';for(const x of [128,640]){c.fillText('HIT',x,150);c.fillText('HIT',x,400);}for(const x of [384,896]){c.font='bold 90px Georgia';c.fillText('V',x,285);}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export class MachineScene{
 constructor(canvas,game){
  this.game=game;this.canvas=canvas;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor('#111d1c');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(39,1,.002,12);this.parts=new Map();this.ballMeshes=new Map();
  const materials={
   well:new THREE.MeshStandardMaterial({color:'#101f1b',roughness:.55}),
   back:new THREE.MeshStandardMaterial({color:'#ece5cf',roughness:.58,metalness:.12}),
   frame:new THREE.MeshStandardMaterial({color:'#133c35',metalness:.65,roughness:.24}),
   rail:new THREE.MeshStandardMaterial({color:'#d3b575',metalness:.9,roughness:.22}),
   pin:new THREE.MeshStandardMaterial({color:'#d9e5e1',metalness:1,roughness:.16}),
   metal:new THREE.MeshStandardMaterial({color:'#929b92',metalness:.85,roughness:.26}),
   brass:new THREE.MeshStandardMaterial({color:'#bca16d',metalness:.8,roughness:.26}),
   glass:new THREE.MeshPhysicalMaterial({color:'#c1e0d9',transparent:true,opacity:.025,roughness:.08,metalness:0,depthWrite:false,side:THREE.DoubleSide}),
   resin:new THREE.MeshPhysicalMaterial({color:'#c1e0d9',transparent:true,opacity:.10,roughness:.1,metalness:.05,clearcoat:1,depthWrite:false,side:THREE.DoubleSide}),
   red:new THREE.MeshStandardMaterial({color:'#b7403e',metalness:.5,roughness:.26}),
   blue:new THREE.MeshStandardMaterial({color:'#295b83',metalness:.5,roughness:.26}),
   green:new THREE.MeshStandardMaterial({color:'#245443',metalness:.25,roughness:.36}),
   bat:new THREE.MeshStandardMaterial({color:'#372c22',roughness:.26,metalness:.24}),
   deck:new THREE.MeshStandardMaterial({color:'#d3b574',roughness:.27,metalness:.65,side:THREE.DoubleSide}),
   wing:new THREE.MeshPhysicalMaterial({color:'#c85335',roughness:.18,metalness:.35,clearcoat:1}),
   rotor:new THREE.MeshStandardMaterial({color:'#ffffff',map:rotorTexture(),roughness:.32,metalness:.45}),
  };this.materials=materials;
  this.scene.add(new THREE.HemisphereLight('#edf8ff','#766346',1.25));const key=new THREE.DirectionalLight('#fff2d6',2.2);key.position.set(-.4,1.2,1.0);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-.4;key.shadow.camera.right=.4;key.shadow.camera.top=.6;key.shadow.camera.bottom=-.6;key.shadow.camera.near=.1;key.shadow.camera.far=3;key.shadow.bias=-.00003;key.shadow.normalBias=.0002;key.target.position.set(0,.4,.02);this.scene.add(key,key.target);const rim=new THREE.DirectionalLight('#9adfe5',.8);rim.position.set(.5,.5,.35);this.scene.add(rim);const fill=new THREE.PointLight('#f5d39b',.9);fill.position.set(0,.2,.6);this.scene.add(fill);
  // A static studio reflection map: generated here, no downloaded environment assets.
  const studio=new THREE.Scene();studio.background=new THREE.Color('#7a8581');for(const [x,y,z,sx,sy,color]of [[-.7,.6,.8,.5,1.8,'#fffff5'],[.8,.6,.4,.22,1.5,'#d1e3e1'],[0,1.1,-.2,2,.22,'#ffffff']]){const lightCard=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));lightCard.position.set(x,y,z);lightCard.lookAt(0,.4,0);studio.add(lightCard);}
  const target=new THREE.WebGLCubeRenderTarget(128);const cc=new THREE.CubeCamera(.01,5,target);cc.position.set(0,.4,0);cc.update(this.renderer,studio);const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromCubemap(target.texture);this.scene.environment=this.environment.texture;pmrem.dispose();target.dispose();
  const pins=[...game.physics.parts.values()].filter(i=>i.shape.role==='pin');
  for(const kind of ['cylinder','sphere']){const items=pins.filter(i=>i.shape.kind===kind),geo=kind==='sphere'?new THREE.SphereGeometry(1,10,8):new THREE.CylinderGeometry(1,1,1,10),batch=new THREE.InstancedMesh(geo,materials.pin,items.length),dummy=new THREE.Object3D();
   items.forEach(({shape:p,body},i)=>{dummy.position.copy(body.translation());dummy.quaternion.copy(body.rotation());dummy.scale.set(p.size.radius,kind==='sphere'?p.size.radius:p.size.height,p.size.radius);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});batch.instanceMatrix.needsUpdate=true;batch.castShadow=true;this.scene.add(batch);}
  for(const item of game.physics.parts.values()){
   if(item.shape.role==='pin')continue;
   const p=item.shape;let geometry;
   if(p.kind==='box')geometry=new THREE.BoxGeometry(...p.size);
   else if(p.kind==='cylinder')geometry=new THREE.CylinderGeometry(p.size.radius,p.size.radius,p.size.height,64);
   else if(p.kind==='sphere')geometry=new THREE.SphereGeometry(p.size.radius,16,12);
   else {geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p.vertices,3));geometry.setIndex(p.indices);geometry.computeVertexNormals();}
   const mesh=new THREE.Mesh(geometry,materials[p.role]||materials.resin);this.scene.add(mesh);mesh.position.copy(item.body.translation());mesh.quaternion.copy(item.body.rotation());mesh.castShadow=!['resin','glass'].includes(p.role);mesh.receiveShadow=!['resin','glass'].includes(p.role);if(p.body==='kinematic')this.parts.set(p.id,mesh);if(['resin','glass'].includes(p.role))mesh.renderOrder=3;
  }
  this.ballGeometry=new THREE.SphereGeometry(game.config.ball.radius,24,16);this.ballMaterial=new THREE.MeshPhysicalMaterial({color:'#e9edf0',metalness:1,roughness:.16,clearcoat:1});
  this.decorate();this.sync(1);this.resize();
 }
 decorate(){
  const addBox=(size,pos,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);this.scene.add(m);return m;};
  for(const side of [-1,1]){addBox([.026,.93,.13],[side*.278,.43,.015],this.materials.frame);addBox([.004,.91,.004],[side*.260,.43,.09],this.materials.brass);}
  addBox([.58,.035,.14],[0,-.028,.02],this.materials.frame);
  const label=(text,x,y,z,width,height,options={})=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:lettering(text,options),side:THREE.DoubleSide}));m.position.set(x,y,z);this.scene.add(m);return m;};
  label('喫茶Unity  /  FIELDER',0,.888,.095,.51,.022,{size:55});
  label('喫茶  /  FIELD CLUB',0,.826,.012,.21,.033,{size:65});
  label('01',-.18,.154,.028,.025,.016,{size:100});label('01',.18,.154,.028,.025,.016,{size:100});label('02',0,.019,.028,.027,.016,{size:100});
  label('開始',-.214,.261,.031,.029,.015,{size:90});label('賞球 14',0,.077,.031,.105,.015,{size:75});
  label('V',0,.442,.027,.018,.014,{bg:'#94352e',size:120});for(const x of [-.044,.044])label('OUT',x,.442,.027,.031,.014,{size:90});
  label('勝負ルート',-.089,.408,.013,.077,.018,{bg:'#883b33',size:85});label('スラッガー',.09,.388,.014,.079,.018,{bg:'#224d6c',size:80});
  // Board graphic is original vector-like geometry: baseball diamond and fine pin guides.
  const lines=[];for(const y of [.64,.69,.74])lines.push(new THREE.Vector3(-.19,y,.0015),new THREE.Vector3(.17,y,.0015));
  const l=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines),new THREE.LineBasicMaterial({color:'#c8b88e',transparent:true,opacity:.45}));this.scene.add(l);
  const diamond=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.098,.31,.215),new THREE.Vector3(0,.36,.14),new THREE.Vector3(.098,.31,.215),new THREE.Vector3(0,.285,.22)]),new THREE.LineBasicMaterial({color:'#e0c58d',transparent:true,opacity:.6}));this.scene.add(diamond);
  // Original medallions, radial brass hardware and a stadium score rail.
  for(const side of [-1,1]){
   const crest=new THREE.Mesh(new THREE.CircleGeometry(.033,48),new THREE.MeshStandardMaterial({color:side<0?'#8a3830':'#285e76',metalness:.42,roughness:.34}));crest.position.set(side*.089,.524,.006);this.scene.add(crest);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.033,.0012,8,48),this.materials.brass);ring.position.copy(crest.position);ring.position.z+=.001;this.scene.add(ring);
   for(let k=0;k<4;k++){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,.002,12),this.materials.metal);screw.rotation.x=Math.PI/2;screw.position.set(side*.276,.1+k*.21,.083);this.scene.add(screw);}
  }
  label('01',-.089,.524,.008,.040,.023,{bg:'#8a3830',size:110});label('02',.089,.524,.008,.040,.023,{bg:'#285e76',size:110});
  for(const hole of this.game.geometry.holes){const points=Array.from({length:48},(_,i)=>new THREE.Vector3(hole.x+Math.cos(i/48*Math.PI*2)*hole.radius,.4181+Math.sin(i/48*Math.PI*2)*hole.radius*.25,hole.z+Math.sin(i/48*Math.PI*2)*hole.radius));this.scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:hole.id==='v'?'#bb482c':'#463f28'})));}
  const rail=new THREE.Mesh(new THREE.BoxGeometry(.24,.004,.008),this.materials.brass);rail.position.set(0,.794,.012);this.scene.add(rail);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.098,.038),new THREE.MeshBasicMaterial({color:'#0a1715'}));screen.position.set(0,.519,.073);this.scene.add(screen);
  this.display=document.createElement('canvas');this.display.width=512;this.display.height=192;this.displayTexture=new THREE.CanvasTexture(this.display);this.displayTexture.colorSpace=THREE.SRGBColorSpace;
  const meter=new THREE.Mesh(new THREE.PlaneGeometry(.095,.035),new THREE.MeshBasicMaterial({map:this.displayTexture}));meter.position.set(0,.519,.074);this.scene.add(meter);
  this.vLamp=new THREE.PointLight('#ffc257',0,.3);this.vLamp.position.set(0,.448,.15);this.scene.add(this.vLamp);
 }
 setQuality(high){this.highQuality=high;this.renderer.shadowMap.enabled=high;this.renderer.setPixelRatio(high?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,1)*.5);for(const material of Object.values(this.materials))material.needsUpdate=true;this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 sync(alpha=1){for(const [id,mesh]of this.parts){const b=this.game.physics.parts.get(id).body;mesh.position.copy(b.translation());mesh.quaternion.copy(b.rotation());}
  const active=this.game.physics.balls;
  for(const [id,mesh]of this.ballMeshes)if(!active.has(id)){this.scene.remove(mesh);this.ballMeshes.delete(id);}
  for(const [id,b]of active){let m=this.ballMeshes.get(id);if(!m){m=new THREE.Mesh(this.ballGeometry,this.ballMaterial);m.renderOrder=1;m.castShadow=true;this.scene.add(m);this.ballMeshes.set(id,m);}m.position.copy(b.previous).lerp(b.body.translation(),alpha);m.quaternion.copy(b.body.rotation());}
  const phase=this.game.phase;this.vLamp.intensity=['START','ROUND','INTERVAL'].includes(phase)?.12:0;
  const text=phase==='ROUND'?`${this.game.round}R  ${this.game.roundHits}/9`:phase==='START'?`${this.game.awardedRounds}R  V`:'FIELD CLUB';if(text!==this.lastDisplay){this.lastDisplay=text;const c=this.display.getContext('2d');c.fillStyle='#071512';c.fillRect(0,0,512,192);c.fillStyle=phase==='PLAY'?'#bbdcb3':'#ffe096';c.textAlign='center';c.textBaseline='middle';c.font='bold 65px monospace';c.fillText(text,256,96,480);this.displayTexture.needsUpdate=true;}
 }
 render(){this.renderer.render(this.scene,this.camera);}
 dispose(){const geometries=new Set([this.ballGeometry]),materials=new Set([this.ballMaterial,...Object.values(this.materials)]),textures=new Set([this.displayTexture]);this.scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);for(const m of obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[])materials.add(m);});for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();this.environment.dispose();this.renderer.dispose();}
}
export {THREE};
