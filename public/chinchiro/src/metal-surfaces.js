import * as THREE from '../../vendor/three/three.module.js';
export function inkAlpha(r,g,b){const l=(r*.2126+g*.7152+b*.0722)/255;return Math.max(0,Math.min(1,(.66-l)/.38));}
function markings(n,image){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 if(n===1&&image){
  const temp=document.createElement('canvas');temp.width=temp.height=256;const t=temp.getContext('2d');t.drawImage(image,29,29,198,198);const pixels=t.getImageData(0,0,256,256);
  for(let i=0;i<pixels.data.length;i+=4){const a=inkAlpha(...pixels.data.slice(i,i+3))*pixels.data[i+3];pixels.data[i]=18;pixels.data[i+1]=48;pixels.data[i+2]=40;pixels.data[i+3]=Math.round(a);}ctx.putImageData(pixels,0,0);
 }else{
  const positions={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n];ctx.fillStyle='#123028';for(const i of positions){ctx.beginPath();ctx.arc(53+(i%3)*75,53+Math.floor(i/3)*75,n===1?27:19,0,Math.PI*2);ctx.fill();}
 }
 const height=document.createElement('canvas');height.width=height.height=256;const h=height.getContext('2d');h.fillStyle='white';h.fillRect(0,0,256,256);h.drawImage(canvas,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;const bump=new THREE.CanvasTexture(height);return {texture,bump};
}
function brush(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(512,512);let seed=713;
 for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=204+(seed>>>27);im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);
 ctx.strokeStyle='#b0b0b0';ctx.globalAlpha=.22;ctx.lineWidth=.45;for(let r=2;r<370;r+=1.4){ctx.beginPath();ctx.arc(256,256,r,0,Math.PI*2);ctx.stroke();}
 const texture=new THREE.CanvasTexture(c);texture.anisotropy=4;return texture;
}
function studioEnvironment(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color('#283a35');
 for(const [pos,size,color]of [[[-.8,.65,.3],[.38,1.5],'#fff4dc'],[[.9,.5,-.1],[.18,1.3],'#dce8ed'],[[0,1.1,-.1],[1.25,1.5],'#edf0e9'],[[0,.3,1],[.6,.6],'#a7b8ad'],[[.25,.9,.8],[.06,1.2],'#fffcf2']]){const m=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(...pos);m.lookAt(0,0,0);studio.add(m);}
 const target=new THREE.WebGLCubeRenderTarget(128),camera=new THREE.CubeCamera(.01,5,target);camera.update(renderer,studio);const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromCubemap(target.texture);pmrem.dispose();target.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.setRenderTarget(null);return env;
}

// A shallow visual engraving only: no added contact surface, mass, or die bias.
function engraving(icon){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.strokeStyle='#173d30';c.fillStyle='#173d30';c.lineWidth=1.8;
 for(const radius of [220,228]){c.beginPath();c.arc(256,256,radius,0,Math.PI*2);c.stroke();}
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;c.beginPath();c.moveTo(256+222*Math.cos(a),256+222*Math.sin(a));c.lineTo(256+226*Math.cos(a),256+226*Math.sin(a));c.stroke();}
 c.font='22px Georgia,serif';c.textAlign='center';c.textBaseline='middle';const text='UNITY  ·  COFFEE & DICE  ·  ';
 for(let i=0;i<text.length;i++){const angle=(i/text.length)*Math.PI*2-Math.PI/2;c.save();c.translate(256+195*Math.cos(angle),256+195*Math.sin(angle));c.rotate(angle+Math.PI/2);c.fillText(text[i],0,0);c.restore();}
 if(icon)c.drawImage(icon,130,130,252,252);else{c.font='38px Georgia,serif';c.fillText('UNITY',256,256);}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export function metalSurfaces(renderer,onStamp){
 const roughness=brush(),env=studioEnvironment(renderer),bowlMaterials=[new THREE.MeshStandardMaterial({color:'#c6a677',metalness:1,roughness:.43,roughnessMap:roughness,envMapIntensity:1.05}),new THREE.MeshStandardMaterial({color:'#dbc095',metalness:1,roughness:.2,envMapIntensity:1.1}),new THREE.MeshStandardMaterial({color:'#ab8c5a',metalness:1,roughness:.5,roughnessMap:roughness,envMapIntensity:.8})];
 const dieMaterial=new THREE.MeshStandardMaterial({color:'#e5e9e7',metalness:1,roughness:.24,envMapIntensity:1.25});
 const textures=[],materials=[];for(const n of [1,6,3,4,2,5]){const pair=markings(n);textures.push(pair);materials.push(new THREE.MeshStandardMaterial({map:pair.texture,bumpMap:pair.bump,bumpScale:.00004,roughness:.58,metalness:.04,transparent:true,alphaTest:.015,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));}
 const stamp=engraving(),stampMaterial=new THREE.MeshStandardMaterial({map:stamp,transparent:true,opacity:.40,depthWrite:false,roughness:.65,metalness:.12,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const image=new Image();let disposed=false;image.onload=()=>{if(disposed)return;const pair=markings(1,image),old=textures[0];textures[0]=pair;materials[0].map=pair.texture;materials[0].bumpMap=pair.bump;materials[0].needsUpdate=true;const previousStamp=stampMaterial.map;stampMaterial.map=engraving(pair.texture.image);stampMaterial.needsUpdate=true;previousStamp.dispose();old.texture.dispose();old.bump.dispose();onStamp?.();};image.src='/assets/unity-mark.webp';
 return {env,bowlMaterials,dieMaterial,materials,stampMaterial,dispose(){disposed=true;for(const m of [...bowlMaterials,dieMaterial,...materials,stampMaterial])m.dispose();for(const p of textures){p.texture.dispose();p.bump.dispose();}stampMaterial.map.dispose();roughness.dispose();env.dispose();}};
}
