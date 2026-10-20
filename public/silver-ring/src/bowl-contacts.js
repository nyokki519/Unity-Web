// Deterministic contact approximations for the legacy surface-constrained bowls.
// No RNG, win flags or post-entry outcome selection belong in this module.
export function advanceHop(ball,dt,gravity){
 if(!(ball.hopY>0||ball.hopV>0)){ball.hopY=0;ball.hopV=0;return;}
 ball.hopV=(ball.hopV||0)-gravity*dt;ball.hopY=Math.max(0,(ball.hopY||0)+ball.hopV*dt);
 if(ball.hopY===0)ball.hopV=ball.hopV<-.15?-ball.hopV*.14:0;
}
export function resolveLipContact(ball,{x,z,key,radius,band,restitution=.35,friction=.06,minSpeed=.08,maxHopSpeed=.28}){
 const dx=ball.px-x,dz=ball.pz-z,d=Math.hypot(dx,dz);
 ball.lipTouches??=new Set();
 if(d>radius+band+.003||d<radius-band-.003){ball.lipTouches.delete(key);return 0;}
 if(Math.abs(d-radius)>band||d<1e-8||ball.hopY>.0005||ball.hopV>.05||ball.lipTouches.has(key))return 0;
 const side=d>=radius?1:-1,nx=side*dx/d,nz=side*dz/d,vn=ball.pvx*nx+ball.pvz*nz;
 if(vn>=-minSpeed)return 0;
 ball.lipTouches.add(key);
 const before=ball.pvx**2+ball.pvz**2,impulse=-(1+restitution)*vn;
 ball.pvx+=impulse*nx;ball.pvz+=impulse*nz;
 const tangentX=-nz,tangentZ=nx,vt=ball.pvx*tangentX+ball.pvz*tangentZ;
 const drag=Math.sign(vt)*Math.min(Math.abs(vt),friction*impulse);
 ball.pvx-=drag*tangentX;ball.pvz-=drag*tangentZ;
 const lost=Math.max(0,before-ball.pvx**2-ball.pvz**2);
 // A fraction of impact energy becomes a visible hop; the remainder dissipates.
 ball.hopV=Math.max(ball.hopV||0,Math.min(maxHopSpeed,Math.sqrt(lost*.32)));
 return -vn;
}
export function resolveBowlPair(a,b,{radius,restitution=.8,friction=.08,heightA=0,heightB=0,maxHopSpeed=.28}){
 const dx=b.px-a.px,dz=b.pz-a.pz,dy=heightB-heightA,diameter=radius*2,d=Math.hypot(dx,dy,dz);
 if(d>=diameter)return 0;
 const nx=d>1e-9?dx/d:1,ny=d>1e-9?dy/d:0,nz=d>1e-9?dz/d:0;
 // Resolve initial overlap along the constrained surface, never by teleporting upward.
 const planar=Math.hypot(dx,dz),separation=Math.sqrt(Math.max(0,diameter*diameter-dy*dy)),overlap=(separation-planar)/2,px=planar>1e-9?dx/planar:1,pz=planar>1e-9?dz/planar:0;
 a.px-=px*overlap;a.pz-=pz*overlap;b.px+=px*overlap;b.pz+=pz*overlap;
 const av=a.hopV||0,bv=b.hopV||0,rvx=b.pvx-a.pvx,rvy=bv-av,rvz=b.pvz-a.pvz,vn=rvx*nx+rvy*ny+rvz*nz;
 if(vn>=0)return 1e-9;
 const impulse=-(1+restitution)*vn/2,tx=rvx-vn*nx,ty=rvy-vn*ny,tz=rvz-vn*nz,t=Math.hypot(tx,ty,tz),drag=t>1e-9?Math.min(t/2,friction*impulse)/t:0;
 const ix=impulse*nx-drag*tx,iy=impulse*ny-drag*ty,iz=impulse*nz-drag*tz;
 a.pvx-=ix;a.pvz-=iz;b.pvx+=ix;b.pvz+=iz;
 a.hopV=Math.min(maxHopSpeed,av-iy);b.hopV=Math.min(maxHopSpeed,bv+iy);
 if(!a.hopY&&a.hopV<0)a.hopV=0;if(!b.hopY&&b.hopV<0)b.hopV=0;
 return -vn;
}
