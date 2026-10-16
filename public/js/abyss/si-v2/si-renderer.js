import {bowlHeight} from './si-geometry.js';
import * as THREE from '../../../vendor/three/three.module.js';

const deepest = balls => balls.reduce((a,b) => !a || (b.stage||0)>(a.stage||0) || ((b.stage||0)===(a.stage||0)&&b.id>a.id) ? b:a,null);
const vector = p => new THREE.Vector3(p?.x||0,p?.y||0,p?.z||0);
function reflection() {
  const faces = Array.from({length:6},(_,i)=>{
    const c=document.createElement('canvas'); c.width=c.height=64;
    const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,64);
    g.addColorStop(0,'#c4dce5');g.addColorStop(.35,'#14232f');g.addColorStop(.48,'#f5ffff');g.addColorStop(.57,'#526b7b');g.addColorStop(1,'#03080e');
    x.fillStyle=g;x.fillRect(0,0,64,64);x.fillStyle=i%2?'#fff':'#e6c58c';x.fillRect(10,3,5,50);return c;
  }); const t=new THREE.CubeTexture(faces); t.needsUpdate=true;return t;
}
function geometry(p) {
  let g;
  if(p.kind==='mesh') {g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(p.vertices),3));if(p.indices)g.setIndex(new THREE.BufferAttribute(new Uint32Array(p.indices),1));g.computeVertexNormals();}
  else if(p.kind==='box') {const e=p.halfExtents;g=new THREE.BoxGeometry(e.x*2,e.y*2,e.z*2);}
  else if(p.kind==='capsule')g=new THREE.CapsuleGeometry(p.radius,2*(p.halfHeight||0),3,8);
  else g=new THREE.CylinderGeometry(p.radius,p.radius,2*p.halfHeight,10);
  return g;
}
function fallback(canvas,board) {
  const ctx=canvas.getContext('2d'); let w=1,h=1;
  const resize=()=>{const r=canvas.getBoundingClientRect();w=canvas.width=Math.max(1,r.width);h=canvas.height=Math.max(1,r.height);};resize();
  return {mode:'canvas',resize,setView(){},resetView(){},dispose(){},render(game){
    ctx.fillStyle='#07111c';ctx.fillRect(0,0,w,h);const scale=Math.min(w/.58,h/.95),ox=(w-.5*scale)/2,oy=h*.92;
    const point=(x,y,z)=>[ox+x*scale,oy-y*scale-z*scale*.35];
    ctx.strokeStyle='#647581';ctx.lineWidth=1;
    for(const p of board.parts||[]) {if(p.visible===false||p.tag==='glass')continue;const g=geometry(p);const a=g.getAttribute('position');const q=new THREE.Quaternion(p.rotation?.x||0,p.rotation?.y||0,p.rotation?.z||0,p.rotation?.w??1),pos=vector(p.position);const ids=g.index?.array;ctx.beginPath();for(let i=0;i<(ids?.length||a.count);i+=3){for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(a,ids?ids[i+j]:i+j).applyQuaternion(q).add(pos);const s=point(v.x,v.y,v.z);j?ctx.lineTo(...s):ctx.moveTo(...s);}ctx.closePath();}ctx.stroke();g.dispose();}
    for(const b of game.balls||[]) {const s=point(b.x,b.y,b.z);ctx.beginPath();ctx.arc(...s,(b.r||.0055)*scale,0,Math.PI*2);ctx.fillStyle='#edfaff';ctx.fill();}
    ctx.fillStyle='#abc0cb';ctx.font='11px monospace';ctx.fillText('SI · CANVAS PROJECTION',12,20);
  }};
}
export function createRenderer(canvas,board) {
  let renderer;try {renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});}catch{return fallback(canvas,board);}
  renderer.localClippingEnabled=true;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.setClearColor(0x071a16);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,5),env=reflection();scene.environment=env;
  scene.add(new THREE.HemisphereLight(0xd8efff,0x2d2013,2));const key=new THREE.DirectionalLight(0xffe1ac,3);key.position.set(-.3,1.2,1);scene.add(key);
  const materials={back:new THREE.MeshStandardMaterial({color:0x0d2922,metalness:.65,roughness:.4}),steel:new THREE.MeshStandardMaterial({color:0x9cb4b4,metalness:.9,roughness:.25,side:THREE.DoubleSide}),brass:new THREE.MeshStandardMaterial({color:0xc99a49,metalness:.85,roughness:.25,side:THREE.DoubleSide}),glass:new THREE.MeshPhysicalMaterial({color:0xc3e8f5,transparent:true,opacity:.055,depthWrite:false,roughness:.1,metalness:.1}),chrome:new THREE.MeshStandardMaterial({color:0xecf6ff,metalness:1,roughness:.13,side:THREE.DoubleSide})};
  const buckets=new Map(),resources=[],gates=[];
  for(const p of board.parts||[]) {
    if(p.visible===false)continue;let g=geometry(p);const mat=p.tag==='glass'?'glass':p.tag==='back'?'back':['bowl','rim','gate'].includes(p.tag)?'brass':['pin','shaft'].includes(p.tag)?'chrome':'steel';
    if(p.tag==='gate'){const m=new THREE.Mesh(g,materials[mat]);m.position.copy(vector(p.position));if(p.rotation)m.quaternion.set(p.rotation.x,p.rotation.y,p.rotation.z,p.rotation.w);scene.add(m);gates.push(m);resources.push(g);continue;}
    const matrix=new THREE.Matrix4().compose(vector(p.position),new THREE.Quaternion(p.rotation?.x||0,p.rotation?.y||0,p.rotation?.z||0,p.rotation?.w??1),new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(g);
  }
  for(const [mat,geos] of buckets){const count=geos.reduce((s,g)=>s+g.attributes.position.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3);let offset=0;for(const g of geos){positions.set(g.attributes.position.array,offset);normals.set(g.attributes.normal.array,offset);offset+=g.attributes.position.array.length;g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));resources.push(g);scene.add(new THREE.Mesh(g,materials[mat]));}
  // Aperture rings only decorate the actual openings; they do not cover holes.
  const apertureGood=new THREE.MeshStandardMaterial({color:0xffd36d,metalness:.9,roughness:.18,emissive:0x47300b}),apertureMiss=new THREE.MeshStandardMaterial({color:0x343e3b,metalness:.8,roughness:.3});
  for(const t of board.trays||[])for(const h of t.holes){const geo=new THREE.TorusGeometry(h.r+.0004,.0005,4,32),ring=new THREE.Mesh(geo,h.win?apertureGood:apertureMiss);ring.rotation.x=Math.PI/2;ring.position.set(t.cx+h.x,bowlHeight(t,h.x,h.z)+.0004,t.cz+h.z);scene.add(ring);resources.push(geo);}
  const ballMaterial=new THREE.MeshStandardMaterial({color:0xf2ffff,metalness:.72,roughness:.18,emissive:0x203f35,emissiveIntensity:.4});
  const ballGeo=new THREE.SphereGeometry(1,16,12);resources.push(ballGeo);const ballMeshes=new Map();
  const markerGeo=new THREE.TorusGeometry(.005,.0007,4,20),markerMat=new THREE.MeshBasicMaterial({color:0x50efdd,depthTest:false}),marker=new THREE.Mesh(markerGeo,markerMat);scene.add(marker);resources.push(markerGeo);
  const traceGeo=new THREE.BufferGeometry(),traceMat=new THREE.LineBasicMaterial({color:0x62cbd5,transparent:true,opacity:.45}),trace=new THREE.LineSegments(traceGeo,traceMat);scene.add(trace);resources.push(traceGeo);
  const heatGeo=new THREE.SphereGeometry(1,6,4),heatMat=new THREE.MeshBasicMaterial({transparent:true,opacity:.45,depthWrite:false}),heat=new THREE.InstancedMesh(heatGeo,heatMat,640);heat.count=0;scene.add(heat);resources.push(heatGeo);
  const view={zoom:1,panX:0,panY:0};const target=new THREE.Vector3(.25,.4,.05),eye=new THREE.Vector3(.25,1.1,1.2);let initialized=false,lastQuality,lastStage=0,focusUntil=0;
  const cut=new THREE.Plane(new THREE.Vector3(0,-1,0),1),bottomCut=new THREE.Plane(new THREE.Vector3(0,1,0),1);
  const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);camera.updateProjectionMatrix();};resize();
  return {mode:'webgl',resize,setView(v={}){for(const k of Object.keys(view))if(Number.isFinite(v[k]))view[k]=v[k];view.zoom=THREE.MathUtils.clamp(view.zoom,1,4);},resetView(){Object.assign(view,{zoom:1,panX:0,panY:0});initialized=false;},
    render(game,opts={}) {
      if(opts.quality!==lastQuality){lastQuality=opts.quality;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,opts.quality==='low'?1:opts.quality==='high'?1.5:1.25));resize();}
      const balls=game.balls||[],active=new Set();for(const b of balls){active.add(b.id);let mesh=ballMeshes.get(b.id);if(!mesh){mesh=new THREE.Mesh(ballGeo,ballMaterial);scene.add(mesh);ballMeshes.set(b.id,mesh);}mesh.position.set(b.x,b.y,b.z);mesh.scale.setScalar(b.r||.0055);if(b.rotation)mesh.quaternion.set(b.rotation.x,b.rotation.y,b.rotation.z,b.rotation.w);}
      for(const [id,m]of ballMeshes)if(!active.has(id)){scene.remove(m);ballMeshes.delete(id);}
      if(game.gatePose)for(const m of gates){m.position.copy(vector(game.gatePose.position));const q=game.gatePose.rotation;if(q)m.quaternion.set(q.x,q.y,q.z,q.w);}
      let mode=opts.camera||'overview';const focus=deepest(balls);
      if(focus?.stage>0&&focus.zone==='tray'){lastStage=focus.stage;focusUntil=game.elapsed+1.2;}
      if(mode==='auto')mode=focus?.zone==='tray'?`cradle${focus.stage}`:lastStage&&game.elapsed<focusUntil?`cradle${lastStage}`:focus?'forest':'overview';
      if(opts.reducedMotion&&opts.camera==='auto')mode='overview';
      target.set(.25,.4,.05);eye.set(.25,1.1,1.2);
      const trayIndex={cradle1:0,cradle2:1,cradle3:2}[mode];
      if(trayIndex!==undefined){const t=board.trays?.[trayIndex];if(t){target.set(t.cx,t.cy,t.cz);target.y-=.008;const distance=(2*t.radius+.022)/(2*Math.tan(38*Math.PI/360)*camera.aspect);eye.copy(target).add(new THREE.Vector3(0,.95,.3).normalize().multiplyScalar(distance));}}
      else if(mode==='follow'&&focus){target.set(focus.x,focus.y,focus.z);eye.copy(target).add(new THREE.Vector3(0,.24,.40));}
      else if(mode==='forest'){target.set(.235,.53,.007);eye.set(.235,.59,.94);}
      else if(mode==='rail'){target.set(.42,.43,.03);eye.set(.72,.65,.8);}
      else if(mode==='gate'){const p=game.gatePose?.position||board.parts?.find(p=>p.tag==='gate')?.position;if(p){target.copy(vector(p));eye.copy(target).add(new THREE.Vector3(.06,.18,.35));}}
      const focusedTray=trayIndex!==undefined?board.trays[trayIndex]:null;
      cut.constant=focusedTray?focusedTray.cy+.032:2;bottomCut.constant=focusedTray?-(focusedTray.cy-focusedTray.depth-.035):2;
      for(const material of [...Object.values(materials),ballMaterial,apertureGood,apertureMiss])material.clippingPlanes=focusedTray?[cut,bottomCut]:[];
      if(mode==='free'){target.x+=view.panX*.0005;target.y-=view.panY*.0005;eye.x+=view.panX*.0005;eye.y-=view.panY*.0005;eye.sub(target).divideScalar(view.zoom).add(target);}
      camera.position.lerp(eye,!initialized||opts.reducedMotion?1:.16);camera.lookAt(target);initialized=true;
      const pin=board.pins?.[opts.selectedPin];marker.visible=!!pin;if(pin)marker.position.set(pin.x,pin.y,pin.z+.005);
      const segments=[];if(opts.trails){for(const route of [...(game.traces||[]).slice(-20),...(game.successRoutes||[]).slice(-8)]){const points=Array.isArray(route)?route:route.points||[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Number.isFinite(a.x)&&Number.isFinite(b.x))segments.push(a.x,a.y,a.z||0,b.x,b.y,b.z||0);}}}traceGeo.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));trace.visible=segments.length>0;
      heat.count=0;if(opts.heatmap){const s=game.stats||{},mode=opts.heatmapMode,values=mode==='pins'?s.pinHits:mode==='stalled'?s.stalled:mode==='outflow'?s.outflow:s.heatmap;const max=Math.max(1,...(values||[])),matrix=new THREE.Matrix4(),color=new THREE.Color();for(let i=0;i<Math.min(640,values?.length||0);i++){if(!values[i])continue;const pin=board.pins?.[i],cols=s.heatmapCols||20,rows=s.heatmapRows||32,n=values[i]/max;let x=mode==='pins'?pin?.x:((i%cols)+.5)*board.width/cols,y=mode==='pins'?pin?.y:board.height-(Math.floor(i/cols)+.5)*board.height/rows;if(mode==='outflow'){x=(i+.5)*board.width/values.length;y=.02;}if(!Number.isFinite(x)||!Number.isFinite(y))continue;matrix.makeScale(.003+Math.sqrt(n)*.009,.003+Math.sqrt(n)*.009,.001);matrix.setPosition(x,y,.055);heat.setMatrixAt(heat.count,matrix);color.setHSL((1-n)*.6,1,.55);heat.setColorAt(heat.count++,color);}heat.instanceMatrix.needsUpdate=true;if(heat.instanceColor)heat.instanceColor.needsUpdate=true;}
      renderer.render(scene,camera);
    },dispose(){resources.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());ballMaterial.dispose();apertureGood.dispose();apertureMiss.dispose();markerMat.dispose();traceMat.dispose();heatMat.dispose();env.dispose();renderer.dispose();ballMeshes.clear();}
  };
}
