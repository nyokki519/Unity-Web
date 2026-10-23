import {createGame} from '../public/mechanical/src/game.js';
import {cloneConfig} from '../public/mechanical/src/config.js';
import {writeFileSync} from 'node:fs';
const reports=[];
for(const force of [.16,.20,.28]){const c=cloneConfig();c.magnet.force=force;c.play.initialBalls=1000;const g=await createGame({seed:'rotor-contact-grid',config:c});let introduced=0,crown=new Set(),peak=0;
 for(let tick=0;tick<240*90;tick++){if(introduced<120&&tick%144===0){const id=g.nextId++;g.ledger.fire(id);g.physics.spawn(id,{x:((introduced%9)-4)*.009,y:.39,z:.145},{x:0,y:0,z:-.1},{rounds:3,long:false});introduced++;}g.step();for(const b of g.physics.balls.values()){const p=b.body.translation();peak=Math.max(peak,p.y);if(p.y>.423&&p.z<.08)crown.add(b.id);}}
 reports.push({forceN:force,introduced,carriedPastCrown:crown.size,peakHeight:peak,snapshot:g.snapshot()});g.dispose();}
writeFileSync(process.argv[2]||'/tmp/mechanical-sensitivity.json',JSON.stringify({method:'120 prescribed rotor-contact initial conditions per force; nine x positions, 0.6s intervals; not normal-launch odds, no artificial success decision',reports},null,2)+'\n');console.log(reports.map(r=>({force:r.forceN,crown:r.carriedPastCrown,v:r.snapshot.stats.v,stalled:r.snapshot.stalled})));
