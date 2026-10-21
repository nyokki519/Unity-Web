// Local force model for surface-constrained bowls, not a full 3D rigid-body solver.
// Rounded support loss is a smooth recess: U = m*g*height. No outcome RNG.
export function lipHeight(d,{inner,outer,depth}){
 if(d>=outer)return 0;
 if(d<=inner)return -depth;
 const t=(d-inner)/(outer-inner);
 return -depth*(1-t*t*(3-2*t));
}
export function applyLipGravity(ball,{x,z,inner,outer,depth,gravity,dt}){
 if((ball.hopY||0)>.0005||(ball.hopV||0)>.05)return 0;
 const dx=ball.px-x,dz=ball.pz-z,d=Math.hypot(dx,dz);
 if(d<=inner||d>=outer)return 0;
 const t=(d-inner)/(outer-inner),slope=depth*6*t*(1-t)/(outer-inner);
 // Acceleration down the rounded support surface; outgoing balls regain height.
 const a=gravity*slope;
 ball.pvx-=dx/d*a*dt;ball.pvz-=dz/d*a*dt;
 return a;
}
export function applyAirJet(ball,{x,z,time,dt,period,duty,radius,acceleration}){
 if(duty<=0||period<=0||radius<=0)return 0;
 const phase=((time%period)+period)%period/period;
 if(phase>=Math.min(1,duty))return 0;
 const d=Math.hypot(ball.px-x,ball.pz-z);
 if(d>=radius)return 0;
 // A fixed nozzle behind the winning hole blows toward the bowl centre.
 // Smooth temporal/spatial envelope, integrated as force rather than an impulse.
 const envelope=Math.sin(Math.PI*phase/Math.min(1,duty))**2;
 const a=acceleration*envelope*(1-(d/radius)**2)**2,n=Math.hypot(x,z);
 if(n<1e-9)return 0;
 ball.pvx-=x/n*a*dt;ball.pvz-=z/n*a*dt;
 return a;
}
// Short compressed-air discharge through the hole, spreading radially over the lip.
// Exact temporal impulse integral avoids a frame-dependent single velocity kick.
export function applyAirBurst(ball,{x,z,elapsed,dt,duration,radius,inner,acceleration}){
 const dx=ball.px-x,dz=ball.pz-z,d=Math.hypot(dx,dz);
 if(d<=inner||d>=radius||elapsed>=duration||elapsed+dt<=0||(ball.holeTime||0)>0)return 0;
 const lo=Math.max(0,elapsed),hi=Math.min(duration,elapsed+dt);
 const integral=t=>t/2-duration*Math.sin(2*Math.PI*t/duration)/(4*Math.PI);
 const dv=acceleration*(integral(hi)-integral(lo))*(1-(d/radius)**2)**2;
 ball.pvx+=dx/d*dv;ball.pvz+=dz/d*dv;
 return dv;
}
// Elastic oblique contact in the legacy surface plane, with a swept time of impact.
// Only trajectories that miss the open aperture encounter this lip contact proxy.
// Central entries and already unsupported/falling balls keep their existing route.
export function advanceLipGraze(ball,{x,z,radius,captureRadius,dt}){
 if(dt<=0||(ball.holeTime||0)>0||(ball.hopY||0)>.0005||(ball.hopV||0)>.05)return 0;
 const dx=ball.px-x,dz=ball.pz-z,vx=ball.pvx,vz=ball.pvz,v2=vx*vx+vz*vz;
 if(v2<.08**2)return 0;
 const approach=dx*vx+dz*vz,r2=dx*dx+dz*dz;
 if(approach>=0||r2<radius*radius-1e-12)return 0;
 const cross=dx*vz-dz*vx;
 if(cross*cross/v2<=(captureRadius+.001)**2)return 0;
 const disc=approach*approach-v2*(r2-radius*radius);
 if(disc<=0)return 0;
 const t=Math.max(0,(-approach-Math.sqrt(disc))/v2);
 if(t>dt)return 0;
 const cx=dx+vx*t,cz=dz+vz*t,nx=cx/radius,nz=cz/radius,vn=vx*nx+vz*nz;
 if(vn>=-1e-8)return 0;
 ball.pvx=vx-2*vn*nx;ball.pvz=vz-2*vn*nz;
 ball.px=x+cx+ball.pvx*(dt-t);ball.pz=z+cz+ball.pvz*(dt-t);
 return -vn;
}
