import {mergeGeometries} from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import * as THREE from '../../vendor/three/three.module.js';
export function stageMaterials(){
 const standard=(color,metalness,roughness)=>new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:.65});
 return {rail:standard(0xb6c4cc,.88,.34),support:standard(0x243430,.72,.55),entry:standard(0xb89a60,.82,.34),
  edge:new THREE.MeshPhysicalMaterial({color:0xb5d1d5,metalness:0,roughness:.28,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,clearcoat:.35})};
}
export function createStageStructure({R,edgeY,merge=true,surfaceY=(x,z)=>edgeY*(Math.hypot(x,z)/R)**2.2},mats){
 const group=new THREE.Group();group.name='formed-rim-and-side-mounts';
 // A rounded, 3mm-thick outer return, outside the playable bowl radius.
 const profile=[[R+.010,edgeY+.012],[R+.012,edgeY+.012],[R+.016,edgeY+.025],[R+.015,edgeY+.029],[R+.013,edgeY+.030],[R+.011,edgeY+.027],[R+.010,edgeY+.012]];
 const rim=new THREE.Mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),72),mats.edge);
 rim.userData.formedRim=true;rim.renderOrder=9;group.add(rim);
 const attach=mesh=>{mesh.userData.loadBearing=true;group.add(mesh);return mesh;};
 // U carrier stays behind the holes; a crossbar through z=0 would block OUT.
 const rearZ=-.095,sideX=R*.76;
 const rear=attach(new THREE.Mesh(new THREE.BoxGeometry(sideX*2+.028,.006,.012),mats.support));
 rear.position.set(0,-.029,rearZ);
 const link=attach(new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.026,16),mats.support));
 link.position.set(0,-.042,rearZ);link.userData.armConnector=true;
 for(const side of [-1,1]){
  const beam=attach(new THREE.Mesh(new THREE.BoxGeometry(.012,.006,-rearZ),mats.support));
  beam.position.set(side*sideX,-.029,rearZ/2);
  const mount=attach(new THREE.Mesh(new THREE.BoxGeometry(.028,.006,.046),mats.support));
  mount.position.set(side*sideX,-.025,0);
  for(const z of [-.014,.014]){
   const x=side*sideX,y=surfaceY(x,z),e=.0001;
   const normal=new THREE.Vector3(-(surfaceY(x+e,z)-surfaceY(x-e,z))/(2*e),1,-(surfaceY(x,z+e)-surfaceY(x,z-e))/(2*e)).normalize();
   const postTop=y-.006,postBottom=-.023;
   const post=attach(new THREE.Mesh(new THREE.CylinderGeometry(.0045,.006,postTop-postBottom,16),mats.support));
   post.position.set(x,(postTop+postBottom)/2,z);
   const bolt=attach(new THREE.Mesh(new THREE.CylinderGeometry(.0038,.0042,.0035,6),mats.rail));
   bolt.position.set(x,y,z).addScaledVector(normal,-.004);bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);bolt.userData.mountBolt=true;
   const washer=attach(new THREE.Mesh(new THREE.CylinderGeometry(.0052,.0052,.001,16),mats.support));
   washer.position.set(x,y,z).addScaledVector(normal,-.006);washer.quaternion.copy(bolt.quaternion);
  }
 }
 if(merge){
  const members=group.children.filter(o=>o.userData.loadBearing);
  for(const material of [mats.support,mats.rail]){
   const parts=members.filter(o=>o.material===material),geometries=parts.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});
   const merged=new THREE.Mesh(mergeGeometries(geometries),material);
   merged.userData.mountBoltCount=parts.filter(o=>o.userData.mountBolt).length;
   group.add(merged);for(const geometry of geometries)geometry.dispose();
  }
  for(const member of members){group.remove(member);member.geometry.dispose();}
 }
 return group;
}
