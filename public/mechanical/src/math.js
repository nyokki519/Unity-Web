export const v=(x=0,y=0,z=0)=>({x,y,z});
export const q=(x=0,y=0,z=0,w=1)=>({x,y,z,w});
export const axisAngle=(axis,a)=>{const s=Math.sin(a/2);return q(axis.x*s,axis.y*s,axis.z*s,Math.cos(a/2));};
export const mul=(a,b)=>q(a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z);
export const rotate=(r,p)=>{const t=mul(mul(r,q(p.x,p.y,p.z,0)),q(-r.x,-r.y,-r.z,r.w));return v(t.x,t.y,t.z);};
export const clamp=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
export const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
