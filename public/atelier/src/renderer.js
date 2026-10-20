import * as T from '../../vendor/three/three.module.js';
import {OrbitControls} from '../../vendor/three/addons/controls/OrbitControls.js';
import {buildExitPipes} from './geometry.js';
import {SETTINGS,holes,surfaceHeight,surfaceAt} from './config.js';
export function createRenderer(canvas,dish){
 const mobile=matchMedia('(max-width:850px)').matches;
 const context=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!context)throw new Error('この端末では3D描画を開始できませんでした。');
 const renderer=new T.WebGLRenderer({canvas,context,alpha:false,antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.75:2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#132521');scene.fog=new T.Fog('#132521',1.1,3);
 const camera=new T.PerspectiveCamera(38,1,.008,8);camera.position.set(.23,.43,.49);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,.025,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.34;controls.maxDistance=1.5;controls.minPolarAngle=.25;controls.maxPolarAngle=1.25;controls.minAzimuthAngle=-1.2;controls.maxAzimuthAngle=1.2;
 let fitted=false;
 const resetCamera=()=>{const distance=Math.max(.65,.205/(Math.tan(19*Math.PI/180)*camera.aspect*.88));camera.position.set(.23,.405,.49).normalize().multiplyScalar(distance);camera.position.y+=.025;controls.target.set(0,.025,0);controls.update();};
 // Procedural photographic softboxes: no external HDRI, textures or copied models.
 const room=new T.Scene();room.background=new T.Color('#3b4543');
 const roomMat=new T.MeshBasicMaterial({color:'#4d5854',side:T.BackSide});room.add(new T.Mesh(new T.BoxGeometry(5,5,5),roomMat));
 const panels=[];const softbox=(x,y,z,w,h,color,intensity)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);room.add(m);panels.push(m);};
 softbox(-1.2,1.5,.5,.55,2.4,'#f4f6f1',7);softbox(1.4,.9,-.7,.25,2,'#b9d9d1',5);softbox(0,2,0,1.7,1.7,'#fff0d1',5);softbox(0,.3,2,1.7,.18,'#ffffff',3);
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.03,.1,10);scene.environment=env.texture;scene.environmentIntensity=.55;pmrem.dispose();
 room.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});
 scene.add(new T.HemisphereLight('#edf7ef','#18221e',.65));
 const key=new T.DirectionalLight('#fff2d9',2.1);key.position.set(-.3,.9,.25);key.castShadow=true;key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);key.shadow.camera.left=-.35;key.shadow.camera.right=.35;key.shadow.camera.top=.35;key.shadow.camera.bottom=-.35;key.shadow.camera.near=.01;key.shadow.camera.far=2;key.shadow.bias=-.00008;key.shadow.normalBias=.0007;scene.add(key);
 const fill=new T.DirectionalLight('#b2d2ca',1.1);fill.position.set(.4,.25,-.4);scene.add(fill);
 const ceramic=new T.MeshPhysicalMaterial({color:'#2e4e45',roughness:.25,metalness:.08,clearcoat:1,clearcoatRoughness:.19});
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;const grainContext=grainCanvas.getContext('2d'),grain=grainContext.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=126+Math.sin(Math.hypot(x-128,y-128)*2.8)*14+Math.sin(x*17.17+y*7.31)*5,i=(y*256+x)*4;grain.data[i]=grain.data[i+1]=grain.data[i+2]=n;grain.data[i+3]=255;}grainContext.putImageData(grain,0,0);const grainMap=new T.CanvasTexture(grainCanvas);grainMap.wrapS=grainMap.wrapT=T.RepeatWrapping;
 const titanium=new T.MeshStandardMaterial({color:'#687570',metalness:.94,roughness:.28,bumpMap:grainMap,bumpScale:.00008});
 const brass=new T.MeshStandardMaterial({color:'#bda16a',metalness:1,roughness:.27});
 const black=new T.MeshStandardMaterial({color:'#152521',metalness:.4,roughness:.4});
 const steel=new T.MeshStandardMaterial({color:'#eaf2f3',metalness:1,roughness:.085,envMapIntensity:1.7});
 const add=(geometry,material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(dish.vertices,3));geometry.setIndex(new T.BufferAttribute(dish.indices,1));geometry.computeVertexNormals();
 add(geometry,ceramic);
 const body=add(new T.CylinderGeometry(.183,.172,.081,160,1,true),titanium,0,.0385,0);
 add(new T.CylinderGeometry(.171,.178,.012,128),black,0,-.002,0);
 const torus=(radius,tube,material,y,x=0,z=0)=>{const m=add(new T.TorusGeometry(radius,tube,12,160),material,x,y,z);m.rotation.x=Math.PI/2;return m;};
 torus(.181,.0025,brass,.081);torus(.178,.0007,titanium,.077);torus(.178,.0008,brass,.003);
 // Fine graduation marks and screw slots make scale and construction legible.
 const ticks=new T.InstancedMesh(new T.BoxGeometry(.00065,.00045,.003),brass,90),dummy=new T.Object3D();
 for(let i=0;i<90;i++){const a=i/90*Math.PI*2,r=.174;dummy.position.set(Math.cos(a)*r,surfaceHeight(r)+.0006,Math.sin(a)*r);dummy.rotation.y=-a+Math.PI/2;dummy.scale.set(1,1,i%5===0?1.8:1);dummy.updateMatrix();ticks.setMatrixAt(i,dummy.matrix);}scene.add(ticks);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.24,r=.165,x=Math.cos(a)*r,z=Math.sin(a)*r,y=surfaceHeight(r)+.001;add(new T.CylinderGeometry(.002,.002,.0007,16),titanium,x,y,z);const slot=add(new T.BoxGeometry(.0025,.0002,.0004),black,x,y+.0004,z);slot.rotation.y=a;}
 for(const hole of holes){
  const y=surfaceAt(hole.x,hole.z);
  const pts=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,x=hole.x+Math.cos(a)*SETTINGS.holeRadius,z=hole.z+Math.sin(a)*SETTINGS.holeRadius;pts.push(new T.Vector3(x,surfaceAt(x,z)+.0002,z));}
  const curve=new T.CatmullRomCurve3(pts);add(new T.TubeGeometry(curve,96,.00065,8,false),hole.win?brass:titanium);

  const pocket=add(new T.CylinderGeometry(.012,.009,.006,32),black,hole.x,-.064,hole.z);torus(.0105,.00065,hole.win?brass:titanium,-.057,hole.x,hole.z);
 }
 const pipeData=buildExitPipes(),pipeGeometry=new T.BufferGeometry();pipeGeometry.setAttribute('position',new T.BufferAttribute(pipeData.vertices,3));pipeGeometry.setIndex(new T.BufferAttribute(pipeData.indices,1));pipeGeometry.computeVertexNormals();add(pipeGeometry,new T.MeshStandardMaterial({color:'#60746b',metalness:.85,roughness:.28,side:T.DoubleSide}));
 // Clear perimeter wall, not a full-screen transparent layer over the balls.
 add(new T.CylinderGeometry(.182,.182,.040,160,1,true),new T.MeshPhysicalMaterial({color:'#d0ece3',transparent:true,opacity:.12,roughness:.12,metalness:.05,side:T.DoubleSide,depthWrite:false}),0,.090,0);
 torus(.182,.0008,titanium,.110);
 // Visible feed nozzle over the outer lip; balls are released from its lower end.
 const feed=add(new T.CylinderGeometry(.008,.008,.048,48,1,true),titanium,.160,.083,-.014);feed.rotation.x=Math.PI/2;
 const feedRing=torus(.008,.0009,brass,.083,.160,.010);feedRing.rotation.x=0;
 for(const x of [-.115,.115])for(const z of [-.11,.11]){add(new T.CylinderGeometry(.009,.011,.036,24),titanium,x,-.022,z);torus(.01,.001,black,-.033,x,z);}
 const plinth=add(new T.CylinderGeometry(.235,.24,.018,160),black,0,-.045,0);torus(.233,.0008,brass,-.035);
 const floor=add(new T.PlaneGeometry(8,8),new T.MeshStandardMaterial({color:'#12231f',roughness:.78}),0,-.055,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 const ballGeometry=new T.SphereGeometry(SETTINGS.ballRadius,32,24),ballMeshes=new Map();
 const resize=()=>{const width=Math.round(canvas.clientWidth),height=Math.round(canvas.clientHeight);if(!width||!height)return;const pixel=renderer.getPixelRatio();if(canvas.width!==Math.round(width*pixel)||canvas.height!==Math.round(height*pixel))renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(!fitted){resetCamera();fitted=true;}};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 let lost=false;const loss=e=>{e.preventDefault();lost=true;};canvas.addEventListener('webglcontextlost',loss);
 return{renderer,scene,camera,controls,resetCamera,get lost(){return lost;},render(sim,alpha=1){
  controls.update();for(const[id,mesh]of ballMeshes)if(!sim.balls.has(id)){scene.remove(mesh);ballMeshes.delete(id);}
  for(const ball of sim.balls.values()){
   let mesh=ballMeshes.get(ball.id);if(!mesh){mesh=new T.Mesh(ballGeometry,steel);mesh.castShadow=true;scene.add(mesh);ballMeshes.set(ball.id,mesh);}
   const p=ball.body.translation(),q=ball.body.rotation(),prev=ball.previous;
   mesh.position.set(prev.x+(p.x-prev.x)*alpha,prev.y+(p.y-prev.y)*alpha,prev.z+(p.z-prev.z)*alpha);
   mesh.quaternion.set(ball.previousRotation.x,ball.previousRotation.y,ball.previousRotation.z,ball.previousRotation.w).slerp(new T.Quaternion(q.x,q.y,q.z,q.w),alpha);
  }renderer.render(scene,camera);
 },dispose(){observer.disconnect();canvas.removeEventListener('webglcontextlost',loss);controls.dispose();const geometries=new Set([ballGeometry]),materials=new Set([steel]);scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grainMap.dispose();env.dispose();renderer.dispose();}};
}
