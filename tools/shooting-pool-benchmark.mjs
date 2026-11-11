import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,readdirSync,copyFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game} from '../public/shooting/core.js';

const root=mkdtempSync(join(tmpdir(),'shooting-pool-before-'));
const baseline=join(root,'baseline');mkdirSync(baseline);
for(const file of readdirSync('public/shooting')){
 const source=join('public/shooting',file);if(statSync(source).isFile())copyFileSync(source,join(baseline,file));
}
for(const name of ['pool.js','core.js','combat.js'])writeFileSync(join(baseline,name),execFileSync('git',['show',`HEAD:public/shooting/${name}`]));
const {Game:BaselineGame}=await import(`${pathToFileURL(join(baseline,'core.js')).href}?baseline=${Date.now()}`);
function setup(Type){
 const game=new Type({seed:'active-pool-bench',mode:'campaign',difficulty:'normal'});
 game.enemies=[];game.items=[];game.waveCD=1e9;game.midSpawned=game.bossSpawned=true;game.player.invincible=1e9;
 for(let i=0;i<2200;i++)game.bullets.add(20+i%440,70+i%480,0,0,{owner:0,r:3,life:1000,damage:0});
 return game;
}
function runOnce(Type){
 const game=setup(Type);for(let i=0;i<120;i++)game.update(1/120,{fire:false});
 const start=performance.now();for(let i=0;i<480;i++)game.update(1/120,{fire:false});
 return{ms:performance.now()-start,game};
}
// Pair measurements and alternate ordering to reduce JIT/thermal/order bias.
for(const Type of [BaselineGame,Game]){const game=setup(Type);for(let i=0;i<240;i++)game.update(1/120,{fire:false});}
const baselineTimes=[],currentTimes=[];let before,after;
for(let pair=0;pair<21;pair++){
 const first=pair%2?runOnce(Game):runOnce(BaselineGame),second=pair%2?runOnce(BaselineGame):runOnce(Game);
 const old=pair%2?second:first,now=pair%2?first:second;
 baselineTimes.push(old.ms);currentTimes.push(now.ms);before=old;after=now;
}
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return{median:sorted[10],p90:sorted[18]};};
const old=before.game.snapshot(),now=after.game.snapshot();
const invariant={sameSnapshot:JSON.stringify(old)===JSON.stringify(now),sameStats:JSON.stringify(before.game.stats)===JSON.stringify(after.game.stats),samePlayer:JSON.stringify(before.game.player)===JSON.stringify(after.game.player),sameBulletCount:before.game.bullets.count===after.game.bullets.count};
const baselineSummary=summary(baselineTimes),currentSummary=summary(currentTimes);
const report={scenario:{activeHostileBullets:2200,capacity:8192,warmupTicks:120,measuredTicks:480,pairedTrials:21,order:'alternating',invulnerable:true,unmovingBullets:true},beforeMs:baselineSummary,afterMs:currentSummary,medianSpeedup:Number((baselineSummary.median/currentSummary.median).toFixed(2)),invariant,note:'Node V8 CPU-only fixed-step simulation; does not measure browser GPU, phone frame rate, or gameplay difficulty.'};
console.log(JSON.stringify(report,null,2));rmSync(root,{recursive:true,force:true});
if(!Object.values(invariant).every(Boolean))process.exitCode=1;
