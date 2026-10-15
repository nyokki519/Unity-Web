// Read-only inspection of the deployed model, not an assertion of real-machine dimensions.
import {execFileSync} from 'node:child_process';
import {createBoard,BALL_RADIUS,FIXED_DT} from '../public/js/abyss/config.js';
import {createSimulation} from '../public/js/abyss/engine.js';
import {moveTray} from '../public/js/abyss/physics.js';
const round=n=>Number(n.toFixed(4));
const modes=['easy','normal','abyss'].map(mode=>{
 const b=createBoard(mode),d=BALL_RADIUS*2;
 let minGap=Infinity;
 for(let i=0;i<b.pins.length;i++)for(let j=i+1;j<b.pins.length;j++){
  const a=b.pins[i],p=b.pins[j];minGap=Math.min(minGap,Math.hypot(a.x-p.x,a.y-p.y)-a.r-p.r);
 }
 return {mode,units:'legacy logical units; mm conversion not established',ballDiameter:d,boardToBall:[round(b.width/d),round(b.height/d)],pinDiameterRange:[Math.min(...b.pins.map(p=>p.r*2)),Math.max(...b.pins.map(p=>p.r*2))],minimumPinSurfaceGap:round(minGap),entryToBall:round(b.entry.width/d),fireInterval:b.fireInterval,trays:b.trays.map(t=>({diameter:t.diameter,bowlToBall:round(t.diameter/d),holes:t.holes.length,rpm:t.rpm,winHoleDiameter:round(t.holes.find(h=>h.win).r*2),winHoleToBall:round(t.holes.find(h=>h.win).r*2/d)}))};
});
const tray=structuredClone(createBoard().trays[0]);Object.assign(tray,{spring:0,tiltX:0,tiltY:0,drag:0,omega:0});
const h=tray.holes.find(h=>h.win),b={x:h.x-h.r-20,y:h.y,vx:20000,vy:0,r:BALL_RADIUS,spin:0};
const capture=moveTray(b,tray,0,FIXED_DT,()=>{});
const launch=[1,55,100].map(power=>{
 const g=createSimulation({seed:'audit'});g.fire(power);
 let firstBoard=null;
 for(let i=0;i<240*10&&g.balls.length;i++){
  g.step(FIXED_DT);const ball=g.balls[0];if(ball&&!ball.launching){firstBoard={time:g.elapsed,x:round(ball.x),y:round(ball.y),zone:ball.zone};break;}
 }
 return {power,firstBoard};
});
console.log(JSON.stringify({schema:1,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),machineMeasurement:false,modes,highSpeedHoleCrossing:{speed:20000,accepted:!!capture,win:!!capture?.win,verticalDynamicsEvaluated:false},launch},null,2));
