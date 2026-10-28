import {SHIPS,WEAPONS,SUPPORTS,STAGES,DIFFICULTIES,ITEMS,EVOLUTIONS} from './data.js';
import {BulletPool,random,segmentDistance2} from './pool.js';
import {pattern} from './patterns.js';
import {shootPlayer} from './combat.js';
const STEP=1/120,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
export {GAME_VERSION} from './balance.js';
export class Game {
 constructor(options={}){
  this.options={seed:'unity-shooting',ship:0,weapon:0,support:0,difficulty:'normal',mode:'campaign',stage:0,upgrades:{},...options};
  if(!Object.hasOwn(DIFFICULTIES,this.options.difficulty))this.options.difficulty='normal';
  if(['score','daily'].includes(this.options.mode)){this.options.ship=0;this.options.weapon=0;this.options.support=0;this.options.upgrades={};this.options.weaponLevels={};this.options.supportLevels={};}
  if(this.options.mode==='score'){this.options.stage=0;this.options.difficulty='normal';}
  if(this.options.mode==='daily'){this.options.stage=(Number(this.options.seed)>>>0)%5;this.options.difficulty='hard';}
  for(const[key,arr]of [['ship',SHIPS],['weapon',WEAPONS],['support',SUPPORTS]])if(!Number.isInteger(this.options[key])||!arr[this.options[key]])this.options[key]=0;
  this.stage=clamp(Math.floor(this.options.stage)||0,0,STAGES.length-1);this.difficulty=DIFFICULTIES[this.options.difficulty];this.rng=random(this.options.seed);this.acc=0;this.tick=0;this.time=0;this.stageTime=0;this.phase='play';this.nextId=1;this.events=[];
  this.enemies=[];this.items=[];this.hazards=[];this.turrets=[];this.bullets=new BulletPool();this.boss=null;this.result=null;this.wave=0;this.waveCD=1.5;this.midSpawned=false;this.bossSpawned=false;this.secretSpawned=false;this.lastActions={};this.input={};
  const ship=SHIPS[this.options.ship],u=this.options.upgrades||{},upgrade=k=>clamp(Number(u[k])||0,0,5);this.ship=ship;this.damage=(ship.damage||1)*(1+upgrade('power')*.05)*(1+clamp(Number(this.options.weaponLevels?.[this.options.weapon])||0,0,5)*.02);
  this.player={x:240,y:610,hp:(ship.hp||3)+Math.floor(upgrade('armor')/2),maxHp:(ship.hp||3)+Math.floor(upgrade('armor')/2),bombs:3,energy:100+upgrade('energy')*12,maxEnergy:100+upgrade('energy')*12,drive:0,driveTime:0,level:1+Math.floor(clamp(Number(this.options.weaponLevels?.[this.options.weapon])||0,0,5)/2),supportLevel:clamp(Number(this.options.supportLevels?.[this.options.support])||0,0,5),options:1,invincible:2,focus:false,weapon:this.options.weapon,cooldown:0,supportCD:0,auxCD:0,ricochetCD:0,orbitCD:0,caliber:0,ricochet:0,orbitLevel:0,rapid:0,width:0,laserBoost:0,missileBoost:0,shield:0,specialCD:0,dash:0,magnet:upgrade('magnet'),fused:false};
  this.stats={score:0,kills:0,graze:0,combo:0,peakCombo:0,misses:0,shots:0,hits:0,items:0,parts:0,duration:0,stages:0,weaponUse:{},bossTimes:[]};this.materials={common:0,uncommon:0,rare:0,epic:0,legendary:0};this.stageBaseline={...this.stats};this.comboTime=0;this.supportTime=0;this.stageScore=0;this.stageCredits=0;this.encounters=new Set();this.bossesSeen=new Set();this.itemsSeen=new Set();this.branch=false;
  this.emit('warning',240,180,{text:STAGES[this.stage].name});
 }
 emit(type,x=240,y=200,data={}){this.events.push({type,x,y,...data});if(this.events.length>160)this.events.shift();}
 drainEvents(){return this.events.splice(0);}
 update(dt,input={}){if(this.phase!=='play')return;this.acc+=Math.max(0,Math.min(.25,dt));while(this.acc+1e-10>=STEP&&this.phase==='play'){this.acc=Math.max(0,this.acc-STEP);this.step(STEP,input);}}
 step(dt,input){
  this.input=input;this.tick++;this.time+=dt;this.stageTime+=dt;this.stats.duration=this.time;const p=this.player;
  p.prevX=p.x;p.prevY=p.y;
  p.focus=!!input.focus;p.invincible=Math.max(0,p.invincible-dt);p.specialCD=Math.max(0,p.specialCD-dt);p.dash=Math.max(0,p.dash-dt);p.slowTime=Math.max(0,(p.slowTime||0)-dt);p.driveTime=Math.max(0,p.driveTime-dt);
  const sk=(SUPPORTS[this.options.support]||{}).kind;p.energy=Math.min(p.maxEnergy,p.energy+dt*(sk==='energy'?18+p.supportLevel*2+(p.options-1)*2:10));
  const speed=(p.focus?this.ship.focusSpeed||110:this.ship.speed||260)*(p.dash>0?1.65:1);
  let dx=Number(input.dx)||0,dy=Number(input.dy)||0;
  if(Number.isFinite(input.targetX)&&Number.isFinite(input.targetY)){dx=input.targetX-p.x;dy=input.targetY-p.y;const d=Math.hypot(dx,dy);if(d>0){const move=Math.min(d,speed*dt);p.x+=dx/d*move;p.y+=dy/d*move;}}
  else{const d=Math.hypot(dx,dy);if(d>0){p.x+=dx/Math.max(1,d)*speed*dt;p.y+=dy/Math.max(1,d)*speed*dt;}}
  p.x=clamp(p.x,15,465);p.y=clamp(p.y,35,695);
  for(const key of ['bomb','special','overdrive']){if(input[key]&&!this.lastActions[key])this[key]();this.lastActions[key]=!!input[key];}
  this.comboTime-=dt;if(this.comboTime<=0)this.stats.combo=0;
  this.supportTime+=dt;if(sk==='shield'&&Math.floor(this.supportTime/(12/(1+p.supportLevel*.08+(p.options-1)*.1)))>Math.floor((this.supportTime-dt)/(12/(1+p.supportLevel*.08+(p.options-1)*.1))))p.shield=1;
  if(sk==='heal'&&Math.floor(this.supportTime/(24/(1+p.supportLevel*.08+(p.options-1)*.1)))>Math.floor((this.supportTime-dt)/(24/(1+p.supportLevel*.08+(p.options-1)*.1))))p.hp=Math.min(p.maxHp,p.hp+1);
  shootPlayer(this,dt);this.spawnWaves(dt);this.moveEnemies(dt*(p.slowTime>0?.45:1));if(this.phase!=='play')return;this.moveBullets(dt);if(this.phase!=='play')return;this.moveHazards(dt);this.moveItems(dt);
  if(p.hp<=0)this.finish(false,'装甲限界');
 }
 nearest(x,y,exclude=new Set(),range=1000){let target=null;for(const e of this.enemies){if(e.hp<=0||exclude.has(e.id))continue;const d=Math.hypot(e.x-x,e.y-y);if(d<range){range=d;target=e;}}return target;}
 spawnEnemy(type=0,x=240,y=-40,boss=false,mid=false,secret=false){
  const hp=(boss?(mid?520:1800)+this.stage*430:18+(type%5)*9+this.stage*4)*this.difficulty.hp;
  const e={id:this.nextId++,x,y,baseX:x,baseY:y,r:boss?(mid?35:55):14+(type%3)*4,hp,maxHp:hp,type:type%12,age:0,shoot:boss?1.4:.8+this.rng()*1.6,boss,mid,secret,name:secret?'真核・アカツキ零式':mid?STAGES[this.stage].midName:STAGES[this.stage].bossName,phase:0,parts:[],color:STAGES[this.stage].color,entry:0};
  this.encounters.add(type%12);
  if(boss){if(!mid)this.bossesSeen.add(secret?6:this.stage);const count=mid?2:4;for(let i=0;i<count;i++)e.parts.push({x:x+(i%2?1:-1)*(i<2?48:78),y:y+(i<2?10:30),hp:hp*(mid?.12:.09),maxHp:hp*(mid?.12:.09),dead:false,dx:(i%2?1:-1)*(i<2?48:78),dy:i<2?10:30,r:14});this.boss=e;this.bullets.clear(0);this.hazards=[];this.emit('boss',x,130,{text:e.name});}
  this.enemies.push(e);return e;
 }
 spawnWaves(dt){
  const s=STAGES[this.stage],rush=this.options.mode==='bossrush',midAt=rush?2:s.midAt||65,bossAt=rush?24:s.bossAt||150;
  if(!this.midSpawned&&this.stageTime>=midAt){this.midSpawned=true;this.spawnEnemy(10,240,-70,true,true);}
  if(!this.bossSpawned&&this.stageTime>=bossAt&&!this.boss){this.bossSpawned=true;this.spawnEnemy(11,240,-85,true,false);}
  if(rush||this.boss&&!this.boss.mid||this.stageTime>=bossAt)return;
  this.waveCD-=dt;if(this.waveCD>0||this.enemies.length>=32)return;
  this.wave++;const count=2+this.wave%3+(this.options.difficulty==='extreme'?1:0),type=(this.wave+(s.enemyOffset||this.stage*2))%12;
  if(!this.branch&&this.stats.graze>=50){this.branch=true;this.emit('warning',240,180,{text:'分岐：外周航路を捕捉'});}
  const route=this.options.mode==='daily'?1:this.stats.graze>=50?2:0;
  for(let i=0;i<count;i++){const x=45+(i+.5)*(390/count);this.spawnEnemy((type+(i%2)+route)%12,x,-35-i*30);}
  this.waveCD=Math.max(1.1,(3.5-this.stage*.12)/this.difficulty.rate);
 }
 moveEnemies(dt){
  for(const e of this.enemies){if(e.hp<=0)continue;e.age+=dt;
   if(e.boss){e.y=Math.min(e.mid?125:135,e.y+dt*55);e.x=240+Math.sin(e.age*.46)*(e.mid?105:65);const ratio=e.hp/e.maxHp;e.phase=ratio<.28?2:ratio<.65?1:0;for(const part of e.parts){part.x=e.x+part.dx;part.y=e.y+part.dy;}
    e.shoot-=dt;if(e.y>60&&e.shoot<=0){const lost=e.parts.filter(p=>p.dead).length;const kind=((STAGES[this.stage].patternOffset||0)+e.phase*5+Math.floor(e.age/9))%20;pattern(this,e,kind);if(e.phase>=1&&lost<2)pattern(this,{...e,x:e.x+45,y:e.y+12},(kind+3)%20);e.shoot=(e.mid?1.35:1.0)/(this.difficulty.rate*(1+e.phase*.16))*(1+lost*.12);}
    if(e.age>(e.mid?75:100)){e.shoot-=dt*.5;if(e.age>(e.mid?105:145)){this.emit('warning',240,200,{text:'敵機退避 · タイムアウト'});this.finish(false,'ボス制限時間');return;}}
   }else{
    const v=40+this.stage*7+(e.type%3)*10;switch(e.type){
     case 0:e.y+=v*dt;break;
     case 1:e.y+=v*dt;e.x=e.baseX+Math.sin(e.age*1.8)*50;break;
     case 2:e.y+=v*dt;e.x=e.baseX+Math.sin(e.age*3)*75;break;
     case 3:e.y+=v*.85*dt;e.x=e.baseX+Math.sin(e.age*1.2)*22;break;
     case 4:e.y+=v*dt;e.x+=clamp(this.player.x-e.x,-60,60)*dt*.7;break;
     case 5:e.y=Math.min(220,e.y+v*dt);e.x=e.baseX+Math.sin(e.age)*30;break;
     case 6:e.y+=(e.age<2?35:160)*dt;e.x+=Math.sin(e.age*2)*70*dt;break;
     case 7:e.y+=(e.age<4?v:-110)*dt;break;
     case 8:e.y+=v*.65*dt;e.x=e.baseX+Math.sin(e.age*2.1)*65;break;
     case 9:e.y=Math.min(180,e.y+v*dt);if(e.age>8)e.y+=120*dt;break;
     case 10:e.y+=v*.65*dt;if(Math.floor(e.age/5)>Math.floor((e.age-dt)/5)&&this.enemies.length<26)this.spawnEnemy(0,e.x+25,e.y);break;
     default:e.y+=v*dt;e.x=e.baseX+Math.sin(e.age*1.3)*95;
    }
    e.x=clamp(e.x,20,460);e.shoot-=dt;
    if(e.shoot<=0&&e.y>15&&e.y<this.player.y-95){pattern(this,e,(e.type+(STAGES[this.stage].patternOffset||0))%20);e.shoot=(2.9+(e.type%3)*.4)/this.difficulty.rate;}
    if(e.y>780||e.age>19||e.age>5&&e.y<-80)e.hp=0;
   }
   if(Math.hypot(e.x-this.player.x,e.y-this.player.y)<e.r+(this.ship.hitR||4))this.hurt();
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
 }
 moveBullets(dt){
  const b=this.bullets,p=this.player,hitR=this.ship.hitR||4;
  // Small uniform enemy grid. Bullet swept AABBs visit only nearby buckets.
  const grid=new Map();for(const e of this.enemies){const r=e.r+80;for(let x=Math.floor((e.x-r)/80);x<=Math.floor((e.x+r)/80);x++)for(let y=Math.floor((e.y-r)/80);y<=Math.floor((e.y+r)/80);y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);}}
  for(let i=0;i<b.capacity;i++){if(this.phase!=='play')break;if(!b.active[i])continue;const stepDt=!b.owner[i]&&p.slowTime>0?dt*.45:dt;b.age[i]+=stepDt;b.px[i]=b.x[i];b.py[i]=b.y[i];let vx=b.vx[i],vy=b.vy[i],v=Math.hypot(vx,vy),a=Math.atan2(vy,vx);
   if(b.homing[i]&&(b.owner[i]||b.age[i]<.65)){const target=b.owner[i]?this.nearest(b.x[i],b.y[i]):p;if(target){const desired=Math.atan2(target.y-b.y[i],target.x-b.x[i]),delta=Math.atan2(Math.sin(desired-a),Math.cos(desired-a));a+=clamp(delta,-stepDt*(b.owner[i]?3.4:.45),stepDt*(b.owner[i]?3.4:.45));}}
   a+=b.turn[i]*stepDt;v=Math.max(25,v+b.acceleration[i]*stepDt);b.vx[i]=Math.cos(a)*v;b.vy[i]=Math.sin(a)*v;b.x[i]+=b.vx[i]*stepDt;b.y[i]+=b.vy[i]*stepDt;
   if(b.bounces[i]&&(b.x[i]<8||b.x[i]>472)){b.x[i]=clamp(b.x[i],8,472);b.vx[i]*=-1;b.bounces[i]--;}
   if(b.age[i]>=b.life[i]||b.x[i]<-50||b.x[i]>530||b.y[i]<-90||b.y[i]>800){b.remove(i);continue;}
   if(b.split[i]&&b.age[i]>=b.splitAt[i]){const n=b.split[i];for(let k=0;k<n;k++){const angle=b.owner[i]?-Math.PI/2+(k-(n-1)/2)*.16:TAU*k/n;this.bullets.add(b.x[i],b.y[i],Math.cos(angle)*(b.owner[i]?420:90*this.difficulty.speed),Math.sin(angle)*(b.owner[i]?420:90*this.difficulty.speed),{owner:b.owner[i],kind:b.kind[i],r:3.5,damage:b.damage[i]*.7});}b.remove(i);continue;}
   if(!b.owner[i]){const dist=segmentDistance2(0,0,b.px[i]-(p.prevX??p.x),b.py[i]-(p.prevY??p.y),b.x[i]-p.x,b.y[i]-p.y);if(dist<(b.r[i]+hitR)**2){if(p.invincible<=0){b.remove(i);this.hurt();}continue;}
    if(!b.grazed[i]&&dist<(b.r[i]+hitR+15)**2){b.grazed[i]=1;this.stats.graze++;this.stats.score+=30;this.stats.combo=Math.min(999,this.stats.combo+1);this.stats.peakCombo=Math.max(this.stats.peakCombo,this.stats.combo);p.drive=Math.min(100,p.drive+.65);this.emit('graze',p.x,p.y);}
   }else{
    const near=new Set();for(let x=Math.floor(Math.min(b.px[i],b.x[i])/80);x<=Math.floor(Math.max(b.px[i],b.x[i])/80);x++)for(let y=Math.floor(Math.min(b.py[i],b.y[i])/80);y<=Math.floor(Math.max(b.py[i],b.y[i])/80);y++)for(const e of grid.get(x+','+y)||[])near.add(e);
    for(const e of near){if(this.phase!=='play')break;if(e.hp<=0||b.hitTargets[i]?.has(e.id))continue;let part=e.parts.find(p=>!p.dead&&segmentDistance2(p.x,p.y,b.px[i],b.py[i],b.x[i],b.y[i])<(b.r[i]+(p.r||14))**2);
     if(part||segmentDistance2(e.x,e.y,b.px[i],b.py[i],b.x[i],b.y[i])<(b.r[i]+e.r)**2){b.lastHit[i]=e.id;if(!b.hitTargets[i])b.hitTargets[i]=new Set();b.hitTargets[i].add(e.id);this.stats.hits++;if(part){part.hp-=b.damage[i];if(part.hp<=0&&!part.dead){part.dead=true;this.stats.parts++;this.stats.score+=1800;this.materials.rare++;this.drop(part.x,part.y,'R');this.emit('part',part.x,part.y);}this.damageEnemy(e,b.damage[i]*.25);}else this.damageEnemy(e,b.damage[i]);
      if([8,10].includes(b.kind[i]))this.areaDamage(b.x[i],b.y[i],b.kind[i]===8?45:70,b.damage[i]*.4,e.id);
      if(b.pierce[i]>0)b.pierce[i]--;else{b.remove(i);break;}
     }
    }
   }
  }
 }
 hazard(x,y,angle,rotation=0,width=15,warn=1.2,duration=1.5,owner=0,damage=30,length=900){if(this.hazards.length>=24)return;this.hazards.push({x,y,angle,rotation,width,warn,duration,age:0,owner,damage,length});this.emit('warning',x,y,{text:owner?'':'照射予告'});}
 moveHazards(dt){for(const h of this.hazards){h.age+=dt*(!h.owner&&this.player.slowTime>0?.45:1);if(h.age<h.warn)continue;h.angle+=h.rotation*dt;const bx=h.x+Math.cos(h.angle)*h.length,by=h.y+Math.sin(h.angle)*h.length;
  if(h.owner){for(const e of this.enemies)if(segmentDistance2(e.x,e.y,h.x,h.y,bx,by)<(e.r+h.width/2)**2)this.damageEnemy(e,h.damage*dt);}
  else if(segmentDistance2(this.player.x,this.player.y,h.x,h.y,bx,by)<(h.width/2+(this.ship.hitR||4))**2)this.hurt();
 }this.hazards=this.hazards.filter(h=>h.age<h.warn+h.duration);}
 damageEnemy(e,damage){if(e.hp<=0||this.phase!=='play')return;e.hp-=damage;if(e.hp>0){if(this.tick%8===0)this.emit('hit',e.x,e.y);return;}
  this.stats.kills++;this.stats.combo++;this.stats.peakCombo=Math.max(this.stats.peakCombo,this.stats.combo);this.comboTime=3;const mult=(1+Math.min(3,this.stats.combo/40))*((SUPPORTS[this.options.support]||{}).kind==='score'?1.2+this.player.supportLevel*.02+(this.player.options-1)*.05:1);this.stats.score+=Math.round((e.boss?e.mid?7000:25000:120+e.type*20)*mult*(this.player.driveTime>0?1.7:1));this.player.drive=Math.min(100,this.player.drive+(e.boss?20:1.2));this.materials.common+=e.boss?20:1;
  this.emit('explosion',e.x,e.y,{boss:e.boss,scale:e.boss?3:1});
  if(e.boss){this.bullets.clear(0);this.hazards=[];this.boss=null;this.stats.bossTimes.push(e.age);this.drop(e.x-25,e.y,'H');this.drop(e.x+25,e.y,'B');this.drop(e.x,e.y,'X');this.materials.epic+=e.mid?0:1;
   if(!e.mid){if(this.stage===4&&!this.secretSpawned&&(this.stats.misses===0||this.stats.parts>=12)){this.secretSpawned=true;this.bossSpawned=false;this.emit('warning',240,200,{text:'隠し中枢 · 真の守護者接近'});const hidden=this.spawnEnemy(11,240,-110,true,false,true);hidden.maxHp*=1.3;hidden.hp=hidden.maxHp;this.bossSpawned=true;}else{if(this.secretSpawned)this.materials.legendary++;this.completeStage();}}
  }else{if(e.type===9)this.drop(e.x,e.y,'P');else if(this.rng()<this.dropChance(e))this.drop(e.x,e.y);}
 }
 dropChance(e){return clamp(.22+e.type*.012+Math.min(.12,this.stats.combo*.001)+Math.min(.1,this.stats.graze*.0005)+this.stage*.01+(this.difficulty.reward-1)*.025,.2,.6);}
 drop(x,y,type){if(this.items.length>=120)return;if(!type){const weights=ITEMS.map(i=>Math.max(0,i.weight??1)),sum=weights.reduce((a,b)=>a+b,0);let r=this.rng()*sum;let index=weights.findIndex(w=>(r-=w)<0);type=ITEMS[Math.max(0,index)].id;}
  this.items.push({x,y,type,age:0,rare:['R','X'].includes(type)});
 }
 moveItems(dt){const p=this.player,sk=(SUPPORTS[this.options.support]||{}).kind;for(const item of this.items){item.age+=dt;let d=Math.hypot(p.x-item.x,p.y-item.y);if(p.y<195||d<60+p.magnet*12+(sk==='collect'?110+p.supportLevel*10+(p.options-1)*15:0)){const v=(p.y<195?350:230)*dt;if(d>v){item.x+=(p.x-item.x)/d*v;item.y+=(p.y-item.y)/d*v;}else d=0;}else{item.y+=38*dt;item.x+=Math.sin(item.age*2)*7*dt;}
   if(d<22){this.collect(item.type);item.age=99;}}
  this.items=this.items.filter(i=>i.age<14&&i.y<760);
 }
 collect(type){this.itemsSeen.add(type);const p=this.player;const state=()=>({...p,credits:this.stageCredits,score:this.stats.score,rare:this.materials.rare,epic:this.materials.epic,common:this.materials.common});const before=state();this.stats.items++;let applied=type;if(type==='?')applied=['P','S','W','H','E','G','B'][Math.floor(this.rng()*7)];
  switch(applied){case'A':p.caliber=Math.min(3,p.caliber+1);break;case'Q':p.ricochet=Math.min(3,p.ricochet+1);break;case'T':p.orbitLevel=Math.min(3,p.orbitLevel+1);break;case'D':p.shield=Math.max(1,p.shield);break;case'P':p.level=Math.min(8,p.level+1);break;case'S':p.rapid=Math.min(5,p.rapid+1);break;case'W':p.width=Math.min(3,p.width+1);break;case'L':p.laserBoost=Math.min(3,p.laserBoost+1);break;case'M':p.missileBoost=Math.min(3,p.missileBoost+1);break;case'O':p.options=Math.min(3,p.options+1);break;case'B':p.bombs=Math.min(5,p.bombs+1);break;case'H':p.hp=Math.min(p.maxHp,p.hp+1);break;case'E':p.energy=Math.min(p.maxEnergy,p.energy+40);break;case'G':p.drive=Math.min(100,p.drive+28);break;case'R':this.materials.rare++;break;case'X':this.materials.epic++;p.core=true;break;case'C':this.materials.common+=5;this.stageCredits+=25;break;default:this.stats.score+=1000;}
  this.emit('item',p.x,p.y,{text:applied==='C'?'C +25CR':`${type} 回収`,value:type,applied,before,after:state()});this.evolve();
 }
 evolve(){const p=this.player;let next=p.weapon;for(const rule of EVOLUTIONS){if(rule.from!==null&&rule.from!==p.weapon)continue;if(Object.entries(rule.requires).every(([key,value])=>typeof value==='boolean'?p[key]===value:p[key]>=value))next=rule.to;}
  if(p.core&&p.options===3)p.fused=true;
  if(next!==p.weapon){p.weapon=next;this.emit('evolve',p.x,p.y,{text:`進化：${WEAPONS[next].name}`});}}

 hurt(){const p=this.player;if(p.invincible>0||this.phase!=='play')return;if(p.shield>0){p.shield=0;p.invincible=1.8;this.emit('special',p.x,p.y);return;}p.hp--;p.invincible=2.2;this.stats.misses++;this.stats.combo=0;p.level=Math.max(1,p.level-1);this.emit('hit',p.x,p.y,{player:true});const b=this.bullets;for(let i=0;i<b.capacity;i++)if(b.active[i]&&!b.owner[i]&&Math.hypot(b.x[i]-p.x,b.y[i]-p.y)<90)b.remove(i);if(p.hp<=0)this.finish(false,'装甲限界');}
 areaDamage(x,y,r,damage,exclude=-1){for(const e of this.enemies)if(e.id!==exclude&&Math.hypot(e.x-x,e.y-y)<r+e.r)this.damageEnemy(e,damage);}
 bomb(){const p=this.player;if(p.bombs<=0||this.phase!=='play')return false;const absorbed=this.bullets.count;p.bombs--;p.invincible=Math.max(p.invincible,2.4);this.bullets.clear(0);this.hazards=this.hazards.filter(h=>h.owner);const id=this.options.ship;
  for(const e of [...this.enemies])this.damageEnemy(e,(id===2?180:id===5?70:115)*(e.boss?1:2));
  if(id===1)this.hazard(p.x,p.y,-Math.PI/2,0,60,0,1.5,1,180,900);
  if(id===3)p.slowTime=4;if(id===4){p.shield=2;p.invincible=4;}if(id===5){p.energy=p.maxEnergy;p.drive=Math.min(100,p.drive+Math.min(40,absorbed*.1));}if(id===6){p.hp=Math.min(p.maxHp,p.hp+1);p.options=Math.min(3,p.options+1);}if(id===7){p.drive=Math.min(100,p.drive+30);for(let i=0;i<24;i++){const a=i*TAU/24;this.bullets.add(p.x,p.y,Math.cos(a)*400,Math.sin(a)*400,{owner:1,kind:19,r:8,damage:22,pierce:3});}}
  this.emit('bomb',p.x,p.y,{value:id});return true;}

 special(){const p=this.player,cost=this.options.ship===6?50:35;if(p.specialCD>0||p.energy<cost)return false;p.energy-=cost;p.specialCD=7;const id=this.options.ship;
  if(id===0){p.shield=1;p.invincible=1;}if(id===1){p.dash=3;p.invincible=1.2;}if(id===2||id===3){for(let i=0;i<(id===3?16:9);i++){const a=id===3?-Math.PI/2+(i-7.5)*.12:-Math.PI/2+(i-4)*.08;this.bullets.add(p.x,p.y,Math.cos(a)*600,Math.sin(a)*600,{owner:1,kind:8,r:10,damage:20,pierce:2});}}if(id===4)this.hazard(p.x,p.y,-Math.PI/2,0,30,0,2,1,110,850);if(id===5)for(let i=0;i<8;i++)this.bullets.add(p.x+(i-3.5)*8,p.y,0,-300,{owner:1,kind:6,homing:1,damage:17,r:6});if(id===6)p.hp=Math.min(p.maxHp,p.hp+1);if(id===7){let count=this.bullets.count;this.bullets.clear(0);p.drive=Math.min(100,p.drive+Math.min(30,count*.1));}
  this.emit('special',p.x,p.y,{value:id});return true;
 }
 overdrive(){const p=this.player;if(p.drive<100||p.driveTime>0)return false;p.drive=0;p.driveTime=8;p.invincible=Math.max(p.invincible,.8);this.emit('overdrive',p.x,p.y);return true;}
 completeStage(){if(this.phase!=='play')return;for(const item of this.items)if(item.age<14&&item.y>=0&&item.y<760)this.collect(item.type);this.items=[];this.stats.stages++;this.stats.score+=10000+Math.max(0,3000-this.stats.misses*500);this.materials.uncommon+=8;this.player.invincible=3;this.phase=this.stage>=STAGES.length-2||['time','score','daily'].includes(this.options.mode)?'result':'stageclear';this.makeResult(true,this.secretSpawned?'真の中枢を解放':'作戦完了');this.emit('clear',240,260);}
 finish(clear,reason){if(this.phase!=='play')return;this.phase='result';this.makeResult(clear,reason);this.emit(clear?'clear':'gameover',this.player.x,this.player.y);}
 makeResult(clear,reason){const stats={...this.stats,weaponUse:{...this.stats.weaponUse},bossTimes:[...this.stats.bossTimes]},base=this.stageBaseline;
  this.result={sessionId:String(this.options.runId||this.options.seed),encounters:[...this.encounters],itemsSeen:[...this.itemsSeen],bossesSeen:[...this.bossesSeen],runId:`${this.options.runId||this.options.seed}:${this.stage}`,clear,currency:this.stageCredits,score:this.stats.score,scoreDelta:this.stats.score-(base.score||0),materials:{...this.materials},reason,stage:this.stage,stages:this.stats.stages-base.stages,kills:this.stats.kills-base.kills,misses:this.stats.misses-base.misses,graze:this.stats.graze-base.graze,parts:this.stats.parts-base.parts,items:this.stats.items-base.items,duration:this.time-(base.duration||0),ending:clear?(this.secretSpawned?'true':this.stats.misses===0?'perfect':'clear'):'retry',stats:{...stats,kills:this.stats.kills-base.kills,graze:this.stats.graze-base.graze,misses:this.stats.misses-base.misses,parts:this.stats.parts-base.parts,items:this.stats.items-base.items,stages:this.stats.stages-base.stages}};
 }
 nextStage(){if(this.phase!=='stageclear'||this.stage>=STAGES.length-2)return false;this.stage++;this.stageTime=0;this.stageCredits=0;this.wave=0;this.waveCD=2;this.midSpawned=this.bossSpawned=false;this.secretSpawned=false;this.boss=null;this.enemies=[];this.items=[];this.hazards=[];this.turrets=[];this.bullets.clear();this.materials={common:0,uncommon:0,rare:0,epic:0,legendary:0};this.stageBaseline={...this.stats};this.phase='play';this.result=null;this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);this.player.bombs=Math.min(5,this.player.bombs+1);this.player.x=240;this.player.y=610;this.player.invincible=3;this.emit('warning',240,180,{text:STAGES[this.stage].name});return true;}
 snapshot(){return{tick:this.tick,time:this.time,stage:this.stage,phase:this.phase,player:{...this.player},score:this.stats.score,enemies:this.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp})),bullets:this.bullets.count};}
}
