// Deterministic contact approximations for the legacy surface-constrained bowls.
// No RNG, win flags or post-entry outcome selection belong in this module.
export function advanceHop(ball,dt,gravity){
 if(!(ball.hopY>0||ball.hopV>0)){ball.hopY=0;ball.hopV=0;return;}
 ball.hopV=(ball.hopV||0)-gravity*dt;ball.hopY=Math.max(0,(ball.hopY||0)+ball.hopV*dt);
 if(ball.hopY===0)ball.hopV=ball.hopV<-.15?-ball.hopV*.14:0;
}
export function resolveLipContact(ball,{x,z,key,radius,band,captureRadius=0,deflection=.15,minSpeed=.08}){
 const dx=ball.px-x,dz=ball.pz-z,d=Math.hypot(dx,dz);
 ball.lipTouches??=new Set();
 if(d>radius+band+.003||d<radius-band-.003){ball.lipTouches.delete(key);return 0;}
 if(d<=captureRadius||Math.abs(d-radius)>band||d<1e-8||ball.hopY>.0005||ball.hopV>.05||ball.lipTouches.has(key))return 0;
 const nx=dx/d,nz=dz/d,vn=ball.pvx*nx+ball.pvz*nz;
 if(vn>=-minSpeed)return 0;
 ball.lipTouches.add(key);
 const speed=Math.hypot(ball.pvx,ball.pvz),tx=-nz,tz=nx,vt=ball.pvx*tx+ball.pvz*tz;
 // A slight tangent deflection only: preserve speed and the inward direction.
 // No normal reflection, rim friction, vertical impulse or capture-area steering.
 const radial=vn*(1-Math.max(0,Math.min(.2,deflection))),vx=radial*nx+vt*tx,vz=radial*nz+vt*tz,scale=speed/Math.hypot(vx,vz);
 ball.pvx=vx*scale;ball.pvz=vz*scale;
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
