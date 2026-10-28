const TAU=Math.PI*2;
export function pattern(g,e,kind){
 const density=g.difficulty.density,speed=(72+g.stage*8+(e.boss?12:0))*g.difficulty.speed;
 const aim=Math.atan2(g.player.y-e.y,g.player.x-e.x),phase=e.age*.65+e.phase*.37;
 const shoot=(a,v=speed,opt={},x=e.x,y=e.y)=>g.bullets.add(x,y,Math.cos(a)*v,Math.sin(a)*v,{r:4.2,kind,life:11,...opt});
 const fan=(n,spread,a=aim,opt={})=>{n=Math.max(2,Math.round(n*density));for(let i=0;i<n;i++)shoot(a+(i/(n-1)-.5)*spread,speed,opt);};
 const ring=(n,a=phase,opt={})=>{n=Math.max(6,Math.round(n*density));for(let i=0;i<n;i++)shoot(a+i*TAU/n,speed,opt);};
 switch(kind%20){
 case 0:fan(3,.32);break;
 case 1:for(let i=0;i<6;i++)shoot(Math.PI/2,speed,{r:5},50+i*76,e.y);break;
 case 2:fan(7,1.25);break;
 case 3:ring(18,phase);break;
 case 4:ring(7,phase*2.1,{turn:.13});break;
 case 5:for(let k=0;k<2;k++)ring(6,phase+k*Math.PI,{turn:(k?1:-1)*.2});break;
 case 6:for(let k=0;k<3;k++)fan(4,.65,phase+k*TAU/3,{turn:.22});break;
 case 7:fan(9,1.8,Math.PI/2,{turn:.4});break;
 case 8:fan(7,1.3,aim,{acceleration:65});break;
 case 9:fan(8,1.7,aim,{acceleration:-35,life:13});break;
 case 10:fan(3,.9,aim,{split:5,splitAt:1.4,r:7});break;
 case 11:fan(4,1.1,aim,{homing:1});break;
 case 12:fan(5,2.0,Math.PI/2,{bounces:1});break;
 case 13:fan(8,1.5,aim,{turn:-.36});break;
 case 14:g.hazard(e.x,e.y,aim,0,15,1.2,1.3);break;
 case 15:g.hazard(e.x,e.y,aim,-.22,16,1.6,2.4);break;
 case 16:for(let side of [-1,1])for(let i=0;i<4;i++)shoot(Math.PI/2+side*.42,speed,{r:4.5},e.x+side*(35+i*12),e.y-i*14);break;
 case 17:for(let i=0;i<8;i++)if(i!==Math.floor(g.player.x/60))shoot(Math.PI/2+(i%2?.2:-.2),speed,{r:5},30+i*60,e.y);break;
 case 18:fan(3,.8,aim,{split:8,splitAt:2.0,acceleration:-25,r:9});break;
 case 19:fan(7,1.8);ring(9,phase,{turn:.16});break;
 }
}
