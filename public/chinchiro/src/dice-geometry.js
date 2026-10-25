export const DICE_SIZE=.016,BEVEL=.0008;
export const BOWL={flatRadius:.100,curveRadius:.035,height:.050,thickness:.004};
export const FACES=[{value:1,n:[0,1,0],u:[1,0,0],v:[0,0,-1]},{value:6,n:[0,-1,0],u:[1,0,0],v:[0,0,1]},{value:3,n:[1,0,0],u:[0,0,-1],v:[0,1,0]},{value:4,n:[-1,0,0],u:[0,0,1],v:[0,1,0]},{value:2,n:[0,0,1],u:[1,0,0],v:[0,1,0]},{value:5,n:[0,0,-1],u:[-1,0,0],v:[0,1,0]}];
export function rotate(q,p){const [x,y,z]=p,tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return [x+q.w*tx+q.y*tz-q.z*ty,y+q.w*ty+q.z*tx-q.x*tz,z+q.w*tz+q.x*ty-q.y*tx];}
export function topFace(q){const faces=FACES.map(f=>({value:f.value,alignment:rotate(q,f.n)[1]})).sort((a,b)=>b.alignment-a.alignment);return faces[0].alignment>=Math.cos(Math.PI/6)&&faces[0].alignment-faces[1].alignment>=.2?faces[0]:null;}
function meshBuilder(){const vertices=[],indices=[],keys=new Map();return {vertices,indices,point(p){const key=p.map(x=>x.toFixed(10)).join(',');if(!keys.has(key)){keys.set(key,vertices.length/3);vertices.push(...p);}return keys.get(key);},tri(a,b,c){if(a!==b&&b!==c&&a!==c)indices.push(a,b,c);}};}
export function dieMesh(){
 const m=meshBuilder(),h=DICE_SIZE/2,k=h-BEVEL,coords=[-h,-k,k,h];
 for(const f of FACES){const ids=[];for(const t of coords)for(const s of coords){const p=f.n.map((n,j)=>n*h+f.u[j]*s+f.v[j]*t),core=p.map(x=>Math.max(-k,Math.min(k,x))),d=p.map((x,j)=>x-core[j]),len=Math.hypot(...d);ids.push(m.point(core.map((x,j)=>x+d[j]/len*BEVEL)));}
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){const a=ids[j*4+i],b=ids[j*4+i+1],c=ids[(j+1)*4+i+1],d=ids[(j+1)*4+i];m.tri(a,b,c);m.tri(a,c,d);}
 }
 return {vertices:m.vertices,indices:m.indices};
}
export function meshVolume({vertices:v,indices}){let volume=0;for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(n=>v.slice(n*3,n*3+3));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return Math.abs(volume);}
export function bowlMesh(){
 const {flatRadius:r,curveRadius:s,height:h,thickness:t}=BOWL,profile=[[0,0],[r,0]];
 for(let i=1;i<=20;i++){const a=i/20*Math.PI/2;profile.push([r+s*Math.sin(a),h*(1-Math.cos(a))]);}
 profile.push([.137,.052],[.139,.050]);
 for(let i=20;i>=0;i--){const a=i/20*Math.PI/2;profile.push([r+t+s*Math.sin(a),h*(1-Math.cos(a))-t]);}
 profile.push([0,-t]);const m=meshBuilder(),rings=profile.map(([r,y])=>Array.from({length:96},(_,i)=>m.point([r*Math.cos(i/96*Math.PI*2),y,r*Math.sin(i/96*Math.PI*2)])));
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<96;i++){const k=(i+1)%96,a=rings[j][i],b=rings[j][k],c=rings[j+1][k],d=rings[j+1][i];m.tri(a,b,c);m.tri(a,c,d);}
 return {vertices:m.vertices,indices:m.indices};
}
