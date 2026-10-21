import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
import {writeFileSync} from 'node:fs';
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'docs/qa/retro-clear-lips/comparison.json';
const {lipDepth:depth,lipOuter:outer}=CFG.bowls.contacts,air=CFG.bowls.air.chance,rows=[];
try{
 CFG.bowls.air.chance=0;
 for(let tier=0;tier<3;tier++){
  const run=(d,o)=>{
   CFG.bowls.contacts.lipDepth=d;CFG.bowls.contacts.lipOuter=o;
   const s=new Sim(()=>{},createRng(`audit-${tier}`));s.spawnInBowl(tier);
   const b=s.balls[0],bw=CFG.bowls.list[tier],h=bw.holes[1],nx=Math.cos(h.a),nz=Math.sin(h.a),tx=-nz,tz=nx,hx=nx*bw.ringR,hz=nz*bw.ringR;
   Object.assign(b,{px:hx+nx*.032-tx*.04,pz:hz+nz*.032-tz*.04,pvx:tx*.4,pvz:tz*.4});const path=[];
   for(let i=0;i<=36&&b.mode==='bowl';i++){
    path.push({t:i/240,tangentMm:((b.px-hx)*tx+(b.pz-hz)*tz)*1000,radialMm:((b.px-hx)*nx+(b.pz-hz)*nz)*1000});
    if(i<36)s.step(1/240);
   }
   return{heading:Math.atan2(b.pvz,b.pvx),x:b.px,z:b.pz,mode:b.mode,path};
  };
  const flat=run(0,.043),old=run(.0035,.043),current=run(depth,outer);
  const angle=o=>Math.abs(Math.atan2(Math.sin(o.heading-flat.heading),Math.cos(o.heading-flat.heading)))*180/Math.PI;
  rows.push({stage:tier+1,oldTurnDegrees:angle(old),newTurnDegrees:angle(current),oldDisplacementMm:Math.hypot(old.x-flat.x,old.z-flat.z)*1000,newDisplacementMm:Math.hypot(current.x-flat.x,current.z-flat.z)*1000,flat,old,current});
 }
}finally{CFG.bowls.contacts.lipDepth=depth;CFG.bowls.contacts.lipOuter=outer;CFG.bowls.air.chance=air;}
writeFileSync(output,JSON.stringify({conditions:{windOff:true,oldDepth:.0035,oldOuter:.043,newDepth:depth,newOuter:outer,dt:1/240,steps:36},rows},null,2)+'\n');
console.log(rows.map(({stage,oldTurnDegrees,newTurnDegrees,oldDisplacementMm,newDisplacementMm})=>({stage,oldTurnDegrees,newTurnDegrees,oldDisplacementMm,newDisplacementMm})));
