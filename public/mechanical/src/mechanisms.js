import {v,q,axisAngle,mul,rotate,clamp,smooth} from './math.js';
export function mechanismPose(name,time,state,c){
 if(name.startsWith('wing:')){const side=Number(name.split(':')[1]),angle=c.wing.closed+(c.wing.open-c.wing.closed)*state.wing;
  return {position:v(side*(c.wing.pivotX-c.wing.length/2*Math.cos(angle)),c.wing.y+c.wing.length/2*Math.sin(angle),.017),rotation:axisAngle(v(0,0,1),-side*angle)};}
 if(name==='rotor')return {position:v(c.rotor.x,c.rotor.y,c.rotor.z),rotation:mul(axisAngle(v(1,0,0),c.rotor.omega*time),axisAngle(v(0,0,1),Math.PI/2))};
 if(name==='stopper'){const phase=time%c.stopper.period,open=phase>c.stopper.closedSeconds?Math.sin(Math.PI*(phase-c.stopper.closedSeconds)/(c.stopper.period-c.stopper.closedSeconds)):0;return {position:v(-.085,.482,.032),rotation:axisAngle(v(1,0,0),open*1.3)};}
 if(name==='sway')return {position:v(-.085,.450,.041),rotation:mul(axisAngle(v(0,0,1),Math.sin(time/c.sway.period*Math.PI*2)*c.sway.angle),axisAngle(v(1,0,0),.40))};
 if(name==='bat'){const phase=time%c.bat.period;let stroke=0;
  if(phase<c.bat.attackSeconds)stroke=smooth(phase/c.bat.attackSeconds);
  else if(phase<c.bat.attackSeconds+c.bat.returnSeconds)stroke=1-smooth((phase-c.bat.attackSeconds)/c.bat.returnSeconds);
  const rot=mul(axisAngle(v(1,0,0),.55),axisAngle(v(0,1,0),-c.bat.stroke*stroke));const offset=rotate(rot,v(-.048,0,0));
  return {position:v(.04+offset.x,.308+offset.y,.188+offset.z),rotation:rot};}
 if(name==='attacker')return {position:v(0,.132,state.attacker?.052:.012),rotation:axisAngle(v(1,0,0),state.attacker?1.4:.9)};
 return {position:v(),rotation:q()};
}
export const MAGNET_POLES=[{x:-.028,phi:0},{x:.028,phi:0},{x:0,phi:Math.PI}];
// Softened short-range point-pole force. Rotating pole locations do work via the motor.
// Fixed rear shielding hypothesis releases balls into the visibly modelled deck.
export function magneticForce(p,time,c){
 const r=c.rotor,dy=p.y-r.y,dz=p.z-r.z;
 if(!c.magnet.enabled||Math.abs(p.x-r.x)>r.width/2+.02||Math.hypot(dy,dz)>r.radius+.04)return v();
 if(dy>c.magnet.releaseY&&dz<-.015)return v();
 const force=v(),theta=c.rotor.omega*time;
 for(const pole of MAGNET_POLES){const local=rotate(axisAngle(v(1,0,0),theta),v(pole.x,(r.radius-.002)*Math.sin(pole.phi),(r.radius-.002)*Math.cos(pole.phi)));
  const dx=r.x+local.x-p.x,y=r.y+local.y-p.y,z=r.z+local.z-p.z,d=Math.hypot(dx,y,z);if(d>.042||d<1e-8)continue;
  const magnitude=c.magnet.force/(1+(d/c.magnet.range)**4);force.x+=magnitude*dx/d;force.y+=magnitude*y/d;force.z+=magnitude*z/d;
 }
 const max=c.magnet.force*2,n=Math.hypot(force.x,force.y,force.z);if(n>max){force.x*=max/n;force.y*=max/n;force.z*=max/n;}
 return force;
}
