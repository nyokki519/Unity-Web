import {CONFIG,cloneConfig} from './config.js';
import {BallLedger,chooseTicket,paidRounds,openingWindows} from './economy.js';
import {buildMachine,apertureContains} from './geometry.js';
import {initPhysics,MachinePhysics,crossingDown} from './physics.js';
import {SeededRandom} from './random.js';
import {v,clamp} from './math.js';
export async function createGame(options={}){await initPhysics();return new MechanicalGame(options);}
export class MechanicalGame{
 constructor({seed='unity',config=cloneConfig(),onEvent=()=>{}}={}){
  this.config=config;this.seed=String(seed);this.rng=new SeededRandom(this.seed+':launch');this.electrical=new SeededRandom(this.seed+':electrical');this.onEvent=onEvent;
  this.geometry=buildMachine(config);this.ledger=new BallLedger(config.play.initialBalls);this.tick=0;this.nextId=1;this.lastShot=-Infinity;this.power=.3;this.auto=false;this.hold=false;this.sweep=false;this.paused=false;this.phase='PLAY';this.wing=0;this.opening=null;this.queue=[];this.currentTicket=null;this.commands=[];this.round=0;this.roundHits=0;this.roundTarget=0;this.phaseAt=0;
  this.stats={pickups:0,left:0,right:0,v:0,out:0,starters:0,attacker:0,contacts:0,rounds:{3:0,5:0,10:0},jackpots:0,escapes:0};
  this.physics=new MachinePhysics(config,this.geometry,()=>{this.stats.contacts++;if(this.tick%6===0)this.emit('contact');});
 }
 get time(){return this.tick*this.config.physics.dt;}
 emit(type,extra={}){this.onEvent({type,tick:this.tick,...extra});}
 command(type,value){if(!['power','fire','auto','pause','hold','sweep'].includes(type))return false;if(type==='power'&&!Number.isFinite(value))return false;
  this.commands.push({tick:this.tick,type,value:type==='power'?clamp(value,0,1):type==='fire'?undefined:!!value});
  if(type==='power')this.power=clamp(value,0,1);if(type==='auto')this.auto=!!value;if(type==='hold')this.hold=!!value;if(type==='sweep')this.sweep=!!value;if(type==='pause'){this.paused=!!value;if(value)this.hold=false;}if(type==='fire')return this.fire();return true;
 }
 fire(){const c=this.config;if(this.paused||this.phase==='END'||this.ledger.stock<1||this.physics.balls.size>=c.physics.maxBalls||this.time-this.lastShot<c.play.shotInterval-1e-8)return false;
  const id=this.nextId++;if(!this.ledger.fire(id))return false;const power=this.sweep&&this.auto?this.rng.next():this.power;this.effectivePower=power;const speed=c.launcher.minSpeed+(c.launcher.maxSpeed-c.launcher.minSpeed)*power;
  this.physics.spawn(id,v(c.launcher.x,c.launcher.y,c.launcher.z),v((this.rng.next()-.5)*.012,speed,0));this.lastShot=this.time;this.emit('shot');return true;
 }
 open(type){const ticket=chooseTicket(type,()=>this.electrical.next());this.queue.push({type,ticket});if(this.queue.length>4)this.queue.shift();}
 consume(ball,kind,payout=0){if(!this.ledger.recover(ball.id,kind))return;this.physics.remove(ball.id);if(payout)this.ledger.award(payout);this.emit(kind,{id:ball.id,payout});}
 entry(ball,kind){if(kind==='v'){
   this.stats.v++;const ticket=ball.ticket||chooseTicket(1,()=>this.electrical.next());this.consume(ball,'v');
   if(this.phase==='PLAY'){this.phase='START';this.phaseAt=this.time;this.roundTarget=paidRounds(ticket.rounds);this.awardedRounds=ticket.rounds;this.stats.rounds[ticket.rounds]++;this.stats.jackpots++;this.queue=[];this.opening=null;this.emit('jackpot',{rounds:ticket.rounds});}
  }else{this.stats.out++;this.consume(ball,'out');}}
 step(){if(this.paused||this.phase==='END')return;const dt=this.config.physics.dt;
  if(this.auto||this.hold)this.fire();
  if(!this.opening&&this.queue.length&&this.phase==='PLAY'){this.opening={...this.queue.shift(),at:this.time};this.currentTicket=this.opening.ticket;}
  let target=0;if(this.opening){const t=this.time-this.opening.at,windows=openingWindows(this.opening.type,this.opening.ticket.long);target=windows.some(([a,b])=>t>=a&&t<b)?1:0;if(t>windows.at(-1)[1]+.15)this.opening=null;}
  this.wing+=clamp(target-this.wing,-dt/this.config.wing.travel,dt/this.config.wing.travel);
  this.physics.step(this.time,{wing:this.wing,attacker:this.phase==='ROUND'});this.tick++;
  for(const ball of [...this.physics.balls.values()]){
   const p=ball.body.translation();
   const pickup=crossingDown(ball,.535);if(pickup&&!ball.pickup&&Math.abs(pickup.x)>.009&&Math.abs(pickup.x)<.136&&pickup.z>-.002&&pickup.z<.07){ball.pickup=true;ball.route=pickup.x<0?'left':'right';ball.ticket=this.currentTicket;this.stats.pickups++;this.stats[ball.route]++;this.emit('pickup',{route:ball.route});}
   const deck=crossingDown(ball,.405);if(deck){const hole=this.geometry.holes.find(h=>apertureContains(deck,h,this.config.ball.radius));if(hole){this.entry(ball,hole.id==='v'?'v':'out');continue;}}
   const start=crossingDown(ball,.290);if(start&&Math.abs(start.x+.214)<.010&&start.z<.028&&start.z>-.002&&this.phase==='START'){this.consume(ball,'start');this.beginRound();continue;}
   const attacker=crossingDown(ball,.111);if(attacker&&Math.abs(attacker.x)<.066&&attacker.z>-.002&&attacker.z<.025&&this.phase==='ROUND'){this.stats.attacker++;this.roundHits++;this.consume(ball,'attacker',14);if(this.roundHits>=this.config.play.roundCount)this.finishRound();continue;}
   let caught=false;for(const cup of this.geometry.cups){const point=crossingDown(ball,cup.captureY);if(point&&Math.abs(point.x-cup.x)<=cup.halfClearance+this.config.physics.captureTolerance&&point.z>=cup.minZ&&point.z<=cup.maxZ){this.stats.starters++;this.consume(ball,'starter',5);if(this.phase==='PLAY')this.open(cup.type);caught=true;break;}}
   if(caught)continue;
   if(p.y<-.045||Math.abs(p.x)>.65||Math.abs(p.z)>.65){if(Math.abs(p.x)>.65||Math.abs(p.z)>.65)this.stats.escapes++;this.stats.out++;this.consume(ball,'out');}
  }
  if(this.phase==='ROUND'&&this.time-this.phaseAt>this.config.play.roundSeconds)this.finishRound();
  if(this.phase==='INTERVAL'&&this.time-this.phaseAt>this.config.play.betweenRounds)this.beginRound();
  if(this.ledger.stock===0&&this.physics.balls.size===0){this.phase='END';this.auto=false;this.emit('end');}
 }
 beginRound(){this.phase='ROUND';this.phaseAt=this.time;this.round++;this.roundHits=0;this.emit('round',{round:this.round,total:this.roundTarget});}
 finishRound(){if(this.round>=this.roundTarget){this.phase='PLAY';this.round=0;this.emit('round-end');}else{this.phase='INTERVAL';this.phaseAt=this.time;}}
 fixture(kind){const points={v:[v(0,.437,.052),v(0,-.1,0)],start:[v(-.214,.324,.008),v(0,-.3,0)],attacker:[v(0,.165,.008),v(0,-.3,0)],wing:[v(-.085,.61,.010),v(0,-.15,0)],main:[v(-.085,.525,.03),v(0,-.15,0)],slugger:[v(.085,.535,.025),v(0,-.15,0)],bat:[v(-.04,.318,.173),v(0,-.1,.1)],rotor:[v(.028,.39,.145),v(0,0,-.10)],out:[v(0,-.035,.23),v(0,-.2,0)]};
  if(!points[kind]||this.ledger.stock<1)return null;const id=this.nextId++;this.ledger.fire(id);const b=this.physics.spawn(id,...points[kind],{rounds:3,long:false});if(['wing','main','slugger'].includes(kind))this.open(2);return b;
 }
 snapshot(){return {version:CONFIG.version,seed:this.seed,tick:this.tick,phase:this.phase,power:this.power,auto:this.auto,hold:this.hold,sweep:this.sweep,paused:this.paused,wing:this.wing,round:this.round,roundHits:this.roundHits,roundTarget:this.roundTarget,ledger:this.ledger.snapshot(),stats:structuredClone(this.stats),stalled:[...this.physics.balls.values()].filter(b=>b.still>8).map(b=>b.id),balls:[...this.physics.balls.values()].map(b=>({id:b.id,position:{...b.body.translation()},rotation:{...b.body.rotation()},route:b.route,age:b.age}))};}
 replayData(){return {version:CONFIG.version,seed:this.seed,config:this.config,tick:this.tick,commands:this.commands};}
 dispose(){this.physics.dispose();}
}

export async function replaySession(data){
 if(data.version!==CONFIG.version||!Array.isArray(data.commands)||data.commands.length>1000000||!Number.isInteger(data.tick)||data.tick<0||data.tick>10000000)throw new Error('invalid replay');
 const game=await createGame({seed:data.seed,config:data.config});let i=0;
 try{while(game.tick<data.tick||i<data.commands.length){while(i<data.commands.length&&data.commands[i].tick===game.tick){const c=data.commands[i++];if(!['power','fire','auto','pause','hold','sweep'].includes(c.type)||(c.type==='power'&&!Number.isFinite(c.value)))throw new Error('invalid replay command');game.command(c.type,c.value);}
  if(game.tick>=data.tick)break;if(game.paused||game.phase==='END'||(i<data.commands.length&&data.commands[i].tick<game.tick))throw new Error('replay cannot advance');game.step();}
  if(i!==data.commands.length)throw new Error('replay commands out of range');return game;
 }catch(e){game.dispose();throw e;}
}
