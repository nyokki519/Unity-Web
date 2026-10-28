const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Screen-space hand intent, independent of cards, outcomes and presentation RNG.
export class HandSqueeze{
 constructor(rect,{x,y,progress=0,time=0}){this.rect=rect;this.origin={x,y,progress};this.last={x,y,time};this.travel=clamp(rect.height*.65,160,260);this.gripX=clamp((x-rect.left-rect.width/2)/(rect.width/2),-1,1);this.state={progress,gripX:this.gripX};this.speed=0;}
 move(x,y,time){const dt=Math.max(1,time-this.last.time);this.speed=(this.last.y-y)/dt;this.last={x,y,time};this.state={progress:clamp(this.origin.progress+(this.origin.y-y)/this.travel,0,1),gripX:clamp(this.gripX+(x-this.origin.x)/this.rect.width*.6,-1,1)};return this.state;}
 release(time=this.last.time){return{...this.state,finish:this.state.progress>=.86&&this.origin.y-this.last.y>80&&this.speed>1&&time-this.last.time<100};}
}
