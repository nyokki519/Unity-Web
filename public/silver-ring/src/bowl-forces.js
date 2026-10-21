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
