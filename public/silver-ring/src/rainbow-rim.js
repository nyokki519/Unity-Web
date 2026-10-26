import * as THREE from '../../vendor/three/three.module.js';
const color=new THREE.Color();
export function createRainbowRim(radius){
 const geometry=new THREE.TorusGeometry(radius,.0045,8,64);
 const positions=geometry.attributes.position,hues=new Float32Array(positions.count);
 for(let i=0;i<positions.count;i++)hues[i]=(Math.atan2(positions.getY(i),positions.getX(i))/(Math.PI*2)+1)%1;
 geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(positions.count*3),3));
 const ring=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));
 ring.userData.rainbow=true;ring.userData.rainbowHues=hues;ring.userData.rainbowPhase=0;
 updateRainbowRim(ring,0,false);return ring;
}
export function updateRainbowRim(ring,dt,reduced){
 if(reduced)return;
 ring.userData.rainbowPhase=(ring.userData.rainbowPhase+Math.max(0,dt)*.3)%1;
 const colors=ring.geometry.attributes.color,hues=ring.userData.rainbowHues;
 for(let i=0;i<hues.length;i++){
  color.setHSL((hues[i]+ring.userData.rainbowPhase)%1,1,.58);
  colors.setXYZ(i,color.r,color.g,color.b);
 }
 colors.needsUpdate=true;
}
