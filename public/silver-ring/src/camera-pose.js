const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
export function bowlCameraPose({height,aspect=1,pitch=50,yaw=10,zoom=1}){
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),rad=Math.PI/180;
 const p=clamp(finite(pitch,50),35,75)*rad,y=clamp(finite(yaw,10),-70,70)*rad;
 const distance=1.35*clamp(finite(aspect,1)/.95,.68,1)/clamp(finite(zoom,1),.8,1.5);
 const target=[0,finite(height,1.4)+.01,-.115];
 return{target,position:[Math.sin(y)*Math.cos(p)*distance,target[1]+Math.sin(p)*distance,target[2]+Math.cos(y)*Math.cos(p)*distance]};
}

// Automatic close-up: show hole depth while retaining a view of the ball's side.
export function autoBowlCameraPose({height,aspect=1}){
 const distance=1.25*Math.max(.68,Math.min(1,finite(aspect,1)/.95));
 const pitch=Math.PI/6,yaw=14*Math.PI/180,target=[0,finite(height,1.4)+.01,-.115];
 return {target,position:[Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance]};
}

// Move lens and pivot together; never orbit around a stale height or leave the cabinet.
export function moveFreeCameraHeight(refs,delta){
 const old=refs.controls.target.y,next=Math.max(.2,Math.min(2.9,old+finite(delta,0)));
 refs.controls.target.y=next;refs.camera.position.y+=next-old;
}
