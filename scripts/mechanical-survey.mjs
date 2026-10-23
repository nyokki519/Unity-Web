// Normal launcher only. Fixture results are deliberately excluded.
import {createGame} from '../public/mechanical/src/game.js';
import {cloneConfig} from '../public/mechanical/src/config.js';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hashes=Object.fromEntries(['config','geometry','mechanisms','physics','game','economy','random','math'].map(name=>[name+'.js',createHash('sha256').update(readFileSync(new URL('../public/mechanical/src/'+name+'.js',import.meta.url))).digest('hex')]));
const requested=Number(process.argv[2]||10000),output=process.argv[3]||'/tmp/mechanical-survey.json';
if(!Number.isInteger(requested)||requested<1||requested>100000)throw Error('shot count must be 1..100000');
const config=cloneConfig();config.play.initialBalls=requested+1000;
const game=await createGame({seed:'h3-normal-survey-20261023',config});const started=performance.now();
const phases={},events={};let maxActive=0,peakStalled=0;
game.onEvent=e=>{events[e.type]=(events[e.type]||0)+1;};game.command('sweep',true);game.command('auto',true);
const limit=(requested*config.play.shotInterval+120)/config.physics.dt;
while(game.ledger.fired<requested&&game.tick<limit){const phase=game.phase,before=game.ledger.fired;game.step();if(game.ledger.fired>before)phases[phase]=(phases[phase]||0)+1;maxActive=Math.max(maxActive,game.physics.balls.size);if(game.tick%240===0){peakStalled=Math.max(peakStalled,game.snapshot().stalled.length);if(game.tick%(240*600)===0)process.stderr.write(`${game.ledger.fired}/${requested} pickups=${game.stats.pickups} V=${game.stats.v} active=${game.physics.balls.size} stalled=${game.snapshot().stalled.length}\n`);}}
game.command('auto',false);for(let i=0;i<240*60&&game.physics.balls.size;i++)game.step();
const snapshot=game.snapshot();const report={createdAt:new Date().toISOString(),software:{node:process.version,sourceSha256:hashes},method:'normal launcher, seeded uniformly varying power 0..100%, 100/min, all phases; no fixture injection, no forced outcomes',requested,secondsWall:(performance.now()-started)/1000,config,phases,events,maxActive,peakStalled,snapshot,rates:{pickupPerShot:game.stats.pickups/game.ledger.fired,vPerShot:game.stats.v/game.ledger.fired,vPerPickup:game.stats.pickups?game.stats.v/game.stats.pickups:null,outPerShot:game.stats.out/game.ledger.fired},limits:'Geometry and magnet are uncalibrated reconstruction. This measures this model, not real H3 probability. Active balls remain accounted for, never timed-out/teleported.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,shots:game.ledger.fired,stats:game.stats,active:game.physics.balls.size,stalled:snapshot.stalled,seconds:report.secondsWall}));game.dispose();
