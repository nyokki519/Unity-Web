import earcut from '../../../vendor/earcut/earcut.js';
export const vec=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a,s)=>vec(a.x*s,a.y*s,a.z*s);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const norm=a=>Math.hypot(a.x,a.y,a.z);
export const unit=a=>mul(a,1/(norm(a)||1));
export const cross=(a,b)=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const identity=()=>({x:0,y:0,z:0,w:1});
export function fromY(direction){const d=unit(direction);if(d.y<-.999999)return{x:1,y:0,z:0,w:0};const q={x:d.z,y:0,z:-d.x,w:1+d.y},l=Math.hypot(q.x,q.y,q.z,q.w);for(const k of Object.keys(q))q[k]/=l;return q;}
export function basisRotation(x,y,z){
 const m=[x.x,y.x,z.x,x.y,y.y,z.y,x.z,y.z,z.z],t=m[0]+m[4]+m[8];let q;
 if(t>0){const s=Math.sqrt(t+1)*2;q={w:s/4,x:(m[7]-m[5])/s,y:(m[2]-m[6])/s,z:(m[3]-m[1])/s};}
 else {const i=m[0]>m[4]&&m[0]>m[8]?0:m[4]>m[8]?1:2,j=(i+1)%3,k=(i+2)%3,s=Math.sqrt(1+m[i*3+i]-m[j*3+j]-m[k*3+k])*2,a=[0,0,0];a[i]=s/4;a[j]=(m[j*3+i]+m[i*3+j])/s;a[k]=(m[k*3+i]+m[i*3+k])/s;q={x:a[0],y:a[1],z:a[2],w:(m[k*3+j]-m[j*3+k])/s};}return q;
}
export function box(parts,id,tag,position,halfExtents,rotation=identity(),extra={}){const p={id,tag,kind:'box',position,halfExtents,rotation,...extra};parts.push(p);return p;}
export function rod(parts,id,tag,a,b,radius,extra={}){const d=sub(b,a);const p={id,tag,kind:'capsule',position:mul(add(a,b),.5),rotation:fromY(d),radius,halfHeight:norm(d)/2,start:a,end:b,...extra};parts.push(p);return p;}
export function chute(parts,id,points,width=.026){
 const path=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(norm(sub(a,b)),norm(sub(c,b)))*.22,p=add(b,mul(unit(sub(a,b)),r)),q=add(b,mul(unit(sub(c,b)),r));path.push(p);
  for(let k=1;k<=8;k++){const t=k/8;path.push(add(add(mul(p,(1-t)**2),mul(b,2*t*(1-t))),mul(q,t*t)));}
 }
 path.push(points.at(-1));const vertices=[],indices=[];
 for(let i=0;i<path.length;i++){
  const w=Array.isArray(width)?width[0]+(width[1]-width[0])*i/(path.length-1):width;
  const d=unit(sub(path[Math.min(path.length-1,i+1)],path[Math.max(0,i-1)])),side=unit(vec(d.z||1e-8,0,-d.x)),up=unit(cross(d,side)),floor=sub(path[i],mul(up,.0068));
  for(const p of[add(floor,mul(side,-w/2)),add(floor,mul(side,w/2)),add(add(floor,mul(side,-w/2)),mul(up,.019)),add(add(floor,mul(side,w/2)),mul(up,.019))])vertices.push(p.x,p.y,p.z);
 }
 for(let i=0;i<path.length-1;i++){const a=i*4,b=a+4;indices.push(a,b,a+1,a+1,b,b+1,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
 parts.push({id,kind:'mesh',tag:'chute',position:vec(),rotation:identity(),vertices:new Float32Array(vertices),indices:new Uint32Array(indices),friction:.06,restitution:.04});
}
export function bowlHeight(t,x,z){
 const r=Math.hypot(x,z);
 return t.cy-t.depth+t.depth*(r/t.radius)+t.tilt*x+(t.tiltZ||0)*z;
}
export function bowlMesh(t){
 const coords=[],starts=[],N=72;
 for(let i=0;i<N;i++){const a=i*Math.PI*2/N;coords.push(t.radius*Math.cos(a),t.radius*Math.sin(a));}
 for(const h of t.holes){starts.push(coords.length/2);for(let j=0;j<24;j++){const a=-j*Math.PI*2/24;coords.push(h.x+h.r*Math.cos(a),h.z+h.r*Math.sin(a));}}
 let indices=earcut(coords,starts,2),vertices=[];
 for(let i=0;i<coords.length;i+=2)vertices.push([coords[i],coords[i+1]]);
 // Subdivide the same triangle topology for curved rendering AND curved collision.
 for(let pass=0;pass<3;pass++){
  const cache=new Map(),next=[];function middle(a,b){const key=a<b?`${a},${b}`:`${b},${a}`;if(cache.has(key))return cache.get(key);const p=vertices[a],q=vertices[b],i=vertices.push([(p[0]+q[0])/2,(p[1]+q[1])/2])-1;cache.set(key,i);return i;}
  for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3),ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}indices=next;
 }
 const xyz=[];for(const[x,z]of vertices)xyz.push(t.cx+x,bowlHeight(t,x,z),t.cz+z);
 // Earcut lies in x/z; flip triangles to face +y.
 for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2],pa=vertices[a],pb=vertices[b],pc=vertices[c];if((pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0])>0)[indices[i+1],indices[i+2]]=[c,b];}
 return{vertices:new Float32Array(xyz),indices:new Uint32Array(indices)};
}
export function shaftMesh(t,h){
 const vertices=[],indices=[],N=24,top=bowlHeight(t,h.x,h.z);
 // Open, bevelled collar; never cap the hole.
 for(let row=0;row<3;row++){const radius=h.r+row*.0015;for(let i=0;i<N;i++){const a=i*2*Math.PI/N,y=bowlHeight(t,h.x+h.r*Math.cos(a),h.z+h.r*Math.sin(a))-row*.006;vertices.push(t.cx+h.x+radius*Math.cos(a),y,t.cz+h.z+radius*Math.sin(a));}}
 for(let row=0;row<2;row++)for(let i=0;i<N;i++){const a=row*N+i,b=row*N+(i+1)%N,c=a+N,d=b+N;indices.push(a,c,b,b,c,d);}
 return{vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
