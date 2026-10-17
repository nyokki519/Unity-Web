// Decorative, non-redeemable Unity notes. Never consumes the simulation RNG.
export function createBanknoteRain(THREE,scene){
 const cv=document.createElement('canvas');cv.width=384;cv.height=176;const g=cv.getContext('2d');
 g.fillStyle='#c4b790';g.fillRect(0,0,384,176);g.strokeStyle='#52634b';g.lineWidth=6;g.strokeRect(10,10,364,156);g.lineWidth=2;g.strokeRect(20,20,344,136);
 g.fillStyle='#364b3c';g.textAlign='center';g.font='bold 31px serif';g.fillText('UNITY',192,60);g.font='bold 48px serif';g.fillText('1000',192,113);g.font='15px sans-serif';g.fillText('喫茶Unity · ゲーム内専用',192,146);
 for(const x of [58,326]){g.beginPath();g.ellipse(x,85,25,39,0,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x,53);g.bezierCurveTo(x-22,77,x+22,93,x,117);g.stroke();}
 const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.38,.175),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}),14);
 mesh.frustumCulled=false;mesh.name='Unity decorative banknotes';scene.add(mesh);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),position=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);let time=0;
 function update(dt,{reduced=false,enabled=true}={}){
  mesh.visible=enabled&&!reduced;if(!mesh.visible)return;
  time+=Math.min(.05,Math.max(0,dt));
  for(let i=0;i<14;i++){
   const side=i%2?-1:1,x=side*(.9+(i%4)*.18)+Math.sin(time*.5+i*1.7)*.12;
   const y=4.2-((i*.47+time*(.12+(i%3)*.025))%4.8);
   position.set(x,y,-.85-(i%3)*.14);e.set(Math.sin(time*.45+i)*.35,Math.sin(time*.3+i)*.7,Math.sin(time*.4+i)*.35);q.setFromEuler(e);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);
  }mesh.instanceMatrix.needsUpdate=true;
 }
 update(0);return{mesh,update,get elapsed(){return time;}};
}
