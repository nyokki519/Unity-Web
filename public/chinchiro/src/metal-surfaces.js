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
 const studio=new THREE.Scene();studio.background=new THREE.Color('#707b77');
 for(const [pos,size,color]of [[[-.8,.65,.3],[.3,1.5],'#fffaf0'],[[.9,.5,-.1],[.16,1.3],'#e2e9e8'],[[0,1.1,0],[2.6,2.4],'#ffffff'],[[0,.3,1],[.9,.6],'#c8cbc4']]){const m=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(...pos);m.lookAt(0,0,0);studio.add(m);}
 const target=new THREE.WebGLCubeRenderTarget(64),camera=new THREE.CubeCamera(.01,5,target);camera.update(renderer,studio);const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromCubemap(target.texture);pmrem.dispose();target.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.setRenderTarget(null);return env;
}
export function metalSurfaces(renderer,onStamp){
 const roughness=brush(),env=studioEnvironment(renderer),bowlMaterials=[new THREE.MeshStandardMaterial({color:'#bda06a',metalness:1,roughness:.56,roughnessMap:roughness,envMapIntensity:.85}),new THREE.MeshStandardMaterial({color:'#cfb17b',metalness:1,roughness:.19,envMapIntensity:1}),new THREE.MeshStandardMaterial({color:'#ae915e',metalness:1,roughness:.58,roughnessMap:roughness,envMapIntensity:.75})];
 const dieMaterial=new THREE.MeshStandardMaterial({color:'#d5dedb',metalness:1,roughness:.28,envMapIntensity:1.3});
 const textures=[],materials=[];for(const n of [1,6,3,4,2,5]){const pair=markings(n);textures.push(pair);materials.push(new THREE.MeshStandardMaterial({map:pair.texture,bumpMap:pair.bump,bumpScale:.00004,roughness:.58,metalness:.04,transparent:true,alphaTest:.015,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));}
 const stampMaterial=materials[0].clone();stampMaterial.opacity=.48;
 const image=new Image();let disposed=false;image.onload=()=>{if(disposed)return;const pair=markings(1,image),old=textures[0];textures[0]=pair;materials[0].map=pair.texture;materials[0].bumpMap=pair.bump;materials[0].needsUpdate=true;stampMaterial.map=pair.texture;stampMaterial.bumpMap=pair.bump;stampMaterial.needsUpdate=true;old.texture.dispose();old.bump.dispose();onStamp?.();};image.src='/assets/unity-mark.webp';
 return {env,bowlMaterials,dieMaterial,materials,stampMaterial,dispose(){disposed=true;for(const m of [...bowlMaterials,dieMaterial,...materials,stampMaterial])m.dispose();for(const p of textures){p.texture.dispose();p.bump.dispose();}roughness.dispose();env.dispose();}};
}
