import earcut,{refine} from '../../vendor/earcut/earcut.js';
import {SETTINGS,holes,surfaceHeight,surfaceAt} from './config.js';
// Exactly the same surface is passed to the renderer and the rigid-body solver.
export function buildDish(maxEdge=.0095){
 const xy=[],starts=[];
 const ring=(x,z,r,n)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;xy.push(x+Math.cos(a)*r,z+Math.sin(a)*r);}};
 ring(0,0,SETTINGS.radius,192);
 for(const hole of holes){starts.push(xy.length/2);ring(hole.x,hole.z,SETTINGS.holeRadius,48);}
 let faces=Array.from(earcut(xy,starts,2));
 refine(faces,xy,2);
 for(let depth=0;depth<10;depth++){
  const mids=new Map(),key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(let i=0;i<faces.length;i+=3)for(let e=0;e<3;e++){
   const a=faces[i+e],b=faces[i+(e+1)%3],k=key(a,b);
   if(!mids.has(k)&&Math.hypot(xy[2*a]-xy[2*b],xy[2*a+1]-xy[2*b+1])>maxEdge){const id=xy.length/2;xy.push((xy[2*a]+xy[2*b])/2,(xy[2*a+1]+xy[2*b+1])/2);mids.set(k,id);}
  }
  if(!mids.size)break;
  const next=[];
  for(let i=0;i<faces.length;i+=3){const[a,b,c]=faces.slice(i,i+3),ab=mids.get(key(a,b)),bc=mids.get(key(b,c)),ca=mids.get(key(c,a)),n=Number(ab!==undefined)+Number(bc!==undefined)+Number(ca!==undefined);
   if(n===0)next.push(a,b,c);
   else if(n===3)next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
   else if(n===1){if(ab!==undefined)next.push(a,ab,c,ab,b,c);else if(bc!==undefined)next.push(b,bc,a,bc,c,a);else next.push(c,ca,b,ca,a,b);}
   else {let x=a,y=b,z=c,xyMid=ab,yzMid=bc;if(ab===undefined){x=b;y=c;z=a;xyMid=bc;yzMid=ca;}else if(bc===undefined){x=c;y=a;z=b;xyMid=ca;yzMid=ab;}next.push(x,xyMid,z,xyMid,yzMid,z,xyMid,y,yzMid);}
  }
  faces=next;refine(faces,xy,2);
 }
 const vertices=new Float32Array(xy.length/2*3);
 for(let i=0;i<xy.length/2;i++){const x=xy[i*2],z=xy[i*2+1];vertices.set([x,surfaceAt(x,z),z],i*3);}
 // Earcut's xy winding becomes downward-facing in xz, so reverse every face.
 for(let i=0;i<faces.length;i+=3){const a=faces[i];faces[i]=faces[i+2];faces[i+2]=a;}
 return{vertices,indices:new Uint32Array(faces)};
}

export function buildExitPipes(){
 const vertices=[],indices=[],n=64;
 for(const hole of holes){const base=vertices.length/3;for(let row=0;row<2;row++)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,x=hole.x+Math.cos(a)*SETTINGS.holeRadius,z=hole.z+Math.sin(a)*SETTINGS.holeRadius;vertices.push(x,row===0?surfaceAt(x,z):-.064,z);}
 for(let i=0;i<n;i++){const a=base+i,b=base+(i+1)%n,c=base+n+i,d=base+n+(i+1)%n;indices.push(a,c,b,b,c,d);}}
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
