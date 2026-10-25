// A prescribed hand movement, not an outcome-dependent force on the dice.
// Metres, radians and seconds. The dish supplies work through Rapier contacts.
const smooth = x => {
 const u=Math.max(0,Math.min(1,x));return u*u*u*(10+u*(-15+6*u));
};
export function bowlMotion(time,gesture){
 const {seconds,delay,ramp,brake,radius,frequency,tilt,direction,heave,heaveFrequency}=gesture;
 if(seconds<=0||time<=delay||time>=seconds)return {p:{x:0,y:0,z:0},q:{x:0,y:0,z:0,w:1}};
 const envelope=smooth((time-delay)/ramp)*smooth((seconds-time)/brake);
 const phase=direction*2*Math.PI*frequency*(time-delay);
 const x=envelope*tilt*Math.cos(phase)/2,z=envelope*tilt*Math.sin(phase)/2;
 return {p:{x:envelope*radius*Math.sin(phase),y:envelope*heave*(1-Math.cos(2*Math.PI*heaveFrequency*(time-delay)))/2,z:envelope*radius*Math.cos(phase)},q:{x,y:0,z,w:Math.sqrt(1-x*x-z*z)}};
}
