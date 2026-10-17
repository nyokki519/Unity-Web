const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
export function bowlCameraPose({height,aspect=1,pitch=50,yaw=10,zoom=1}){
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),rad=Math.PI/180;
 const p=clamp(finite(pitch,50),35,75)*rad,y=clamp(finite(yaw,10),-70,70)*rad;
 const distance=1.35*clamp(finite(aspect,1)/.95,.68,1)/clamp(finite(zoom,1),.8,1.5);
 const target=[0,finite(height,1.4)+.01,-.115];
 return{target,position:[Math.sin(y)*Math.cos(p)*distance,target[1]+Math.sin(p)*distance,target[2]+Math.cos(y)*Math.cos(p)*distance]};
}
