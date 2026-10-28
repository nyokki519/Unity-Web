import {UPGRADE_BALANCE as U,orbitPositions,wideningScale} from './balance.js';
import {WEAPONS,SUPPORTS} from './data.js';
const TAU=Math.PI*2;
export function shootPlayer(g,dt){
 const p=g.player;p.cooldown-=dt;p.supportCD-=dt;p.auxCD-=dt;p.ricochetCD-=dt;p.orbitCD-=dt;
 if(p.cooldown<=0&&g.input.fire!==false){
  const id=p.weapon,w=WEAPONS[id]||WEAPONS[0],level=p.level,od=p.driveTime>0?1.5:1,damage=(w.damage||7)*(1+(level-1)*U.powerPerLevel)*g.damage*od*wideningScale(w.kind,level,p.width);
  const n=(level>=6?3:level>=3?2:1)+p.width,speed=w.speed||600;
  const add=(x,y,angle=-Math.PI/2,opt={})=>g.bullets.add(x,y,opt.vx??Math.cos(angle)*speed,opt.vy??Math.sin(angle)*speed,{owner:1,kind:id,r:4,damage,pierce:w.pierce||0,life:(w.range||900)/speed,...opt,r:(opt.r??4)*(1+p.caliber*.22)});
  const enough=p.energy>=(w.energy||0);if(enough){p.energy=Math.max(0,p.energy-(w.energy||0));
   switch(w.kind){
   case 'rapid':add(p.x+(g.tick%2?6:-6),p.y-19,-Math.PI/2,{r:3});break;
   case 'spread':for(let i=-2-p.width;i<=2+p.width;i++)add(p.x,p.y-16,-Math.PI/2+i*.14,{damage:damage*.6});break;
   case 'focus':for(let i=-1;i<=1;i++)add(p.x+i*7,p.y-22,-Math.PI/2,{damage:damage*.85});break;
   case 'laser':add(p.x,p.y-22,-Math.PI/2,{vy:-1400,pierce:20,r:6,life:.6});g.emit('laser',p.x,p.y);break;
   case 'charge':add(p.x,p.y-25,-Math.PI/2,{vy:-1400,damage:damage*7,pierce:25,r:19,life:.6});g.emit('laser',p.x,p.y);break;
   case 'homing':for(let side of[-1,1])add(p.x+side*15,p.y-10,-Math.PI/2+side*.25,{homing:1,r:5});g.emit('missile',p.x,p.y);break;
   case 'cluster':add(p.x,p.y-20,-Math.PI/2,{split:5,splitAt:.35,r:7});g.emit('missile',p.x,p.y);break;
   case 'plasma':add(p.x,p.y-20,-Math.PI/2,{r:13,damage:damage*1.5});break;
   case 'chain':{let from={x:p.x,y:p.y},used=new Set();for(let k=0;k<3+Math.floor(level/3);k++){const e=g.nearest(from.x,from.y,used,k?180:450);if(!e)break;g.emit('chain',e.x,e.y,{fromX:from.x,fromY:from.y});g.damageEnemy(e,damage*.85);used.add(e.id);from=e;}break;}
   case 'explosive':add(p.x,p.y-20,-Math.PI/2,{r:9,damage:damage*1.4});break;
   case 'reflect':for(let s of[-1,1])add(p.x,p.y-20,-Math.PI/2+s*.45,{bounces:2,pierce:2});break;
   case 'drill':add(p.x,p.y-20,-Math.PI/2,{r:5,pierce:8,damage:damage*1.3});break;
   case 'wave':for(let s of[-1,0,1])add(p.x+s*8,p.y-22,-Math.PI/2+s*.06,{r:16,pierce:5,turn:s*.12});break;
   case 'saber':g.hazard(p.x,p.y-12,-Math.PI/2,0,28*(1+p.caliber*.22),0,.22,1,damage*6,135);break;
   case 'absorb':{let absorbed=0;const b=g.bullets;for(let i=0;i<b.capacity;i++)if(b.active[i]&&!b.owner[i]&&Math.hypot(b.x[i]-p.x,b.y[i]-p.y)<90){b.remove(i);absorbed++;}p.energy=Math.min(p.maxEnergy,p.energy+absorbed);add(p.x,p.y-20,-Math.PI/2,{damage:damage+Math.min(15,absorbed),r:9});break;}
   case 'turret':if(g.turrets.length<3)g.turrets.push({x:p.x,y:p.y-35,age:0,cd:0,life:6,damage});break;
   case 'drone':for(let i=0;i<3;i++){const a=g.time*2+i*TAU/3;add(p.x+Math.cos(a)*34,p.y+Math.sin(a)*23,-Math.PI/2,{homing:i===1?1:0});}break;
   case 'burst':for(let i=0;i<16;i++)add(p.x,p.y,-Math.PI/2+i*TAU/16,{damage:damage*.65,r:5});break;
   case 'fusion':for(let s of[-1,0,1])add(p.x+s*14,p.y-20,-Math.PI/2+s*.12,{homing:1,pierce:5,damage:damage*.9,r:8});g.emit('laser',p.x,p.y);break;
   default:for(let i=0;i<n;i++)add(p.x+(i-(n-1)/2)*13,p.y-18);break;
   }
   if(p.width>0&&!['shot','spread'].includes(w.kind))for(let k=0;k<p.width;k++)for(const side of [-1,1])add(p.x+side*(18+k*12),p.y-15,-Math.PI/2+side*(.12+k*.1),{damage:damage*U.sideDamage,r:3.5});
  }else add(p.x,p.y-18,-Math.PI/2,{damage:damage*.45,r:3});
  p.cooldown=(w.interval||.16)/(1+p.rapid*U.rapidPerLevel)/(p.focus?1.12:1)/od;g.stats.shots++;g.stats.weaponUse[id]=(g.stats.weaponUse[id]||0)+1;g.emit('shot',p.x,p.y,{weapon:id});
 }
 if(p.ricochet>0&&p.ricochetCD<=0){p.ricochetCD=U.ricochetInterval;for(let n=0;n<p.ricochet;n++)for(const side of [-1,1])g.bullets.add(p.x+side*18,p.y-10,side*(330+n*35),-230,{owner:1,kind:21,r:6,damage:(8+p.ricochet*4)*U.ricochetInterval/(p.ricochet*2),bounces:2,life:3,pierce:1});}
 if(p.orbitLevel>0&&p.orbitCD<=0){p.orbitCD=U.orbitInterval;for(const pos of orbitPositions(p,g.time))g.bullets.add(pos.x,pos.y,Math.cos(pos.angle)*60,-460,{owner:1,kind:22,r:5,damage:(12+p.orbitLevel*4)*U.orbitInterval/(p.orbitLevel+1),life:2});}
 if(p.auxCD<=0){p.auxCD=U.auxInterval;if(p.missileBoost>0)g.bullets.add(p.x,p.y-25,0,-280,{owner:1,kind:6,homing:1,damage:(U.missileBase+p.missileBoost*U.missilePerLevel)*U.auxInterval/U.auxReferenceInterval,r:5});if(p.laserBoost>0)g.bullets.add(p.x,p.y-25,0,-1200,{owner:1,kind:4,pierce:10,damage:(U.laserBase+p.laserBoost*U.laserPerLevel)*U.auxInterval/U.auxReferenceInterval,r:4});}
 for(const t of g.turrets){t.age+=dt;t.cd-=dt;if(t.cd<=0){t.cd=.17;g.bullets.add(t.x,t.y,0,-600,{owner:1,kind:16,damage:t.damage*.4});}}
 g.turrets=g.turrets.filter(t=>t.age<t.life);
 if(p.supportCD<=0){p.supportCD=((SUPPORTS[g.options.support]||{}).kind==='rapid'?.12:.36)/(1+p.supportLevel*.08);support(g);}
}
function support(g){
 const p=g.player,kind=(SUPPORTS[g.options.support]||SUPPORTS[0]).kind,b=g.bullets;
 if(kind==='secret'){p.drive=Math.min(100,p.drive+.15);p.energy=Math.min(p.maxEnergy,p.energy+1);}
 for(let k=0;k<p.options;k++){
  const s=k%2?1:-1,x=p.x+s*(26+Math.floor(k/2)*15),y=p.y+10;
  if(kind==='turret'){if(g.turrets.length<3)g.turrets.push({x,y:y-35,age:0,cd:0,life:6,damage:8*(1+p.supportLevel*.08)});continue;}
  if(['shield','heal','collect','energy','score'].includes(kind))continue;
  if(kind==='intercept'||kind==='reflect'){let best=-1,dist=110;for(let i=0;i<b.capacity;i++)if(b.active[i]&&!b.owner[i]){const d=Math.hypot(b.x[i]-p.x,b.y[i]-p.y);if(d<dist){dist=d;best=i;}}if(best>=0){if(kind==='reflect'){b.owner[best]=1;b.kind[best]=11;b.vy[best]=-400;b.damage[best]=10;}else b.remove(best);}continue;}
  if(kind==='bomb'){if(g.tick%960<48)g.areaDamage(x,y-120,100,12);continue;}
  b.add(x,y,0,kind==='laser'?-1200:-500,{owner:1,kind:kind==='laser'?4:kind==='homing'?6:17,homing:['homing','secret','fusion'].includes(kind)?1:0,pierce:kind==='laser'?8:0,damage:(kind==='rapid'?3:5+(p.fused?4:0))*(1+p.supportLevel*.08),r:3});
  if(kind==='fusion'||kind==='secret')b.add(x,y,0,-650,{owner:1,kind:4,pierce:5,damage:5,r:3});
 }
}
