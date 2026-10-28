import {segmentDistance2} from '../public/shooting/pool.js';
export const inputFor=g=>{
 const p=g.player,b=g.bullets,threats=[];for(let i=0;i<b.capacity;i++)if(b.active[i]&&!b.owner[i]&&Math.abs(b.y[i]-p.y)<180&&Math.abs(b.x[i]-p.x)<200)threats.push(i);
 const target=g.boss?g.boss.parts.find(x=>!x.dead)||g.boss:g.nearest(p.x,p.y),desired=target?target.x:240;let best={score:-Infinity,dx:0,dy:0,danger:999};
 for(const [dx,dy]of[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
  const x=Math.max(20,Math.min(460,p.x+dx*50)),y=Math.max(470,Math.min(685,p.y+dy*45));let danger=130;
  for(const i of threats){danger=Math.min(danger,Math.sqrt(segmentDistance2(x,y,b.x[i],b.y[i],b.x[i]+b.vx[i]*.38,b.y[i]+b.vy[i]*.38))-b.r[i]);}
  for(const h of g.hazards)if(!h.owner&&h.age>h.warn-.5){danger=Math.min(danger,Math.sqrt(segmentDistance2(x,y,h.x,h.y,h.x+Math.cos(h.angle)*h.length,h.y+Math.sin(h.angle)*h.length))-h.width*.5);}
  const score=Math.min(60,danger)*3-Math.abs(x-desired)*.11-Math.abs(y-595)*.15;if(score>best.score)best={score,dx,dy,danger};
 }
 return{dx:best.dx,dy:best.dy,fire:true,focus:best.danger<35,bomb:best.danger<9&&p.bombs>0,special:best.danger<24&&p.energy>50&&p.specialCD<=0,overdrive:p.drive>=100&&!!g.boss};
};
