import {mkdirSync,writeFileSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {segmentDistance2} from '../public/shooting/pool.js';
import {inputFor} from './shooting-pilot.mjs';

const baselineRef=process.env.SHOOTING_SIM_BASELINE||'294d846';
const baselineSource=process.env.SHOOTING_BASELINE_DIR;
if(!baselineSource)throw new Error('Set SHOOTING_BASELINE_DIR; run via bash tools/with-shooting-baseline.sh node tools/shooting-pilot-hit-trace.mjs');
const variants={baseline:join(tmpdir(),`shooting-hit-trace-before-${process.pid}`),priorLinePositions:join(tmpdir(),`shooting-hit-trace-noform-${process.pid}`),currentProduct:join(tmpdir(),`shooting-hit-trace-current-${process.pid}`),newShapes12px:join(tmpdir(),`shooting-hit-trace-stagger12-${process.pid}`),newShapes24px:join(tmpdir(),`shooting-hit-trace-stagger24-${process.pid}`),newShapes30px:join(tmpdir(),`shooting-hit-trace-stagger30-${process.pid}`),newShapes36px:join(tmpdir(),`shooting-hit-trace-stagger36-${process.pid}`),noEntryStagger:join(tmpdir(),`shooting-hit-trace-unstaggered-${process.pid}`),allShapes24px:join(tmpdir(),`shooting-hit-trace-allshapes24-${process.pid}`)};
for(const dir of Object.values(variants))mkdirSync(dir);
const files=readdirSync('public/shooting').filter(file=>statSync(join('public/shooting',file)).isFile());
for(const file of files){const source=join('public/shooting',file);for(const dir of Object.values(variants))copyFileSync(source,join(dir,file));}
for(const file of ['core.js','balance.js','pool.js','combat.js'])copyFileSync(join(baselineSource,file),join(variants.baseline,file));
const workingCore=await (await import('node:fs/promises')).readFile(join(variants.currentProduct,'core.js'),'utf8');
const formationCall='for(const [i,position] of wavePositions(count,this.wave,this.stage).entries())this.spawnEnemy((type+(i%2)+route)%12,position.x,position.y);';
if(!workingCore.includes(formationCall))throw new Error('Expected wave formation call was not found.');
const staggerMatch=workingCore.match(/export const FORMATION_ENTRY_STAGGER=(\d+);/);
if(!staggerMatch)throw new Error('Current formation spacing constant was not found.');
const currentStagger=Number(staggerMatch[1]);
const returnLine='return{x:position.x,y:position.y-(index===0?0:i*FORMATION_ENTRY_STAGGER)};';
if(!workingCore.includes(returnLine))throw new Error('Expected current new-shapes-only entry stagger was not found.');
const currentVariantName={12:'newShapes12px',24:'newShapes24px',30:'newShapes30px',36:'newShapes36px'}[currentStagger];
if(!currentVariantName)throw new Error(`Unsupported current formation stagger: ${currentStagger}`);
const variantLines={
 priorLinePositions:`for(let i=0;i<count;i++){const x=45+(i+.5)*(390/count);this.spawnEnemy((type+(i%2)+route)%12,x,-35-i*30);}`,
 newShapes12px:'return{x:position.x,y:position.y-(index===0?0:i*12)};',
 currentProduct:returnLine,
 newShapes24px:'return{x:position.x,y:position.y-(index===0?0:i*24)};',
 newShapes30px:'return{x:position.x,y:position.y-(index===0?0:i*30)};',
 newShapes36px:'return{x:position.x,y:position.y-(index===0?0:i*36)};',
 noEntryStagger:'return{x:position.x,y:position.y};',
 allShapes24px:'return{x:position.x,y:position.y-i*24};'
};
const currentHash=createHash('sha256').update(workingCore).digest('hex');
for(const [name,dir] of Object.entries(variants)){
 if(name==='baseline'||name==='currentProduct'||name===currentVariantName)continue;
 let source=workingCore;
 if(name==='priorLinePositions')source=source.replace(formationCall,variantLines.priorLinePositions);
 else source=source.replace(returnLine,variantLines[name]);
 if(source===workingCore)throw new Error(`Variant ${name} did not modify the frozen source.`);
 writeFileSync(join(dir,'core.js'),source);
}
const loaded={};
for(const [name,dir] of Object.entries(variants))loaded[name]=await import(`${pathToFileURL(join(dir,'core.js')).href}?hit-trace-${name}-${process.pid}`);
const expected={
 baseline:{line:[-35,-65,-95,-125,-155],v:[-103,-69,-35,-69,-103]},
 priorLinePositions:{line:[-35,-65,-95,-125,-155],v:[-103,-93,-83,-141,-199]},
 newShapes24px:{line:[-35,-65,-95,-125,-155],v:[-103,-93,-83,-141,-199]},
 currentProduct:{line:[-35,-65,-95,-125,-155],v:[-103,-99,-95,-159,-223]},
 newShapes12px:{line:[-35,-65,-95,-125,-155],v:[-103,-81,-59,-105,-151]},
 newShapes30px:{line:[-35,-65,-95,-125,-155],v:[-103,-99,-95,-159,-223]},
 newShapes36px:{line:[-35,-65,-95,-125,-155],v:[-103,-105,-107,-177,-247]},
 noEntryStagger:{line:[-35,-65,-95,-125,-155],v:[-103,-69,-35,-69,-103]},
 allShapes24px:{line:[-35,-89,-143,-197,-251],v:[-103,-93,-83,-141,-199]}
};
for(const [name,waves] of Object.entries(expected))if(name!=='priorLinePositions'&&name!=='baseline')for(const [wave,ys] of [[1,waves.line],[2,waves.v]]){
 const actual=loaded[name].wavePositions(5,wave,0).map(({y})=>y);
 if(JSON.stringify(actual)!==JSON.stringify(ys))throw new Error(`${name} wave ${wave} coordinate fingerprint mismatch: ${JSON.stringify(actual)} !== ${JSON.stringify(ys)}`);
}
const sourceHashes={workingCore:currentHash};
for(const [name,dir] of Object.entries(variants))sourceHashes[name]=createHash('sha256').update(await (await import('node:fs/promises')).readFile(join(dir,'core.js'))).digest('hex');
if(sourceHashes.currentProduct!==sourceHashes.workingCore)throw new Error('Frozen current-product core hash changed while building analysis variants.');
const count=Math.max(1,Math.min(100,Number(process.env.SHOOTING_TRACE_SEEDS)||50));
const build=process.env.SHOOTING_TRACE_BUILD==='default'?{}:{ship:7,weapon:17,support:12,weaponLevels:{17:5},supportLevels:{12:5},upgrades:{power:5,energy:4}};
function simulate(Type,index){
 const seed=`campaign-extreme-${index}-damage-specialist`;
 const game=new Type({seed,mode:'campaign',difficulty:'extreme',stage:0,...build});let nextInput=0,input={fire:true},hitRows=[],context='outside',lastRemoved=null;
 const remove=game.bullets.remove.bind(game.bullets);
 game.bullets.remove=i=>{if(context==='bullets'&&game.bullets.active[i])lastRemoved={owner:game.bullets.owner[i],kind:game.bullets.kind[i],x:game.bullets.x[i],y:game.bullets.y[i],vx:game.bullets.vx[i],vy:game.bullets.vy[i],r:game.bullets.r[i]};remove(i);};
 const hurt=game.hurt.bind(game);
 game.hurt=()=>{const misses=game.stats.misses,source=context==='bullets'&&lastRemoved?.owner===0?{kind:'projectile',...lastRemoved}:context==='enemies'?{kind:'collision',enemy:game.enemies.filter(e=>Math.hypot(e.x-game.player.x,e.y-game.player.y)<e.r+(game.ship.hitR||4)).map(e=>({type:e.type,boss:e.boss,x:+e.x.toFixed(1),y:+e.y.toFixed(1)})).slice(0,3)}:context==='hazards'?{kind:'hazard',hazards:game.hazards.filter(h=>segmentDistance2(game.player.x,game.player.y,h.x,h.y,h.x+Math.cos(h.angle)*h.length,h.y+Math.sin(h.angle)*h.length)<(h.width/2+(game.ship.hitR||4))**2).map(h=>({x:+h.x.toFixed(1),y:+h.y.toFixed(1),width:h.width,age:+h.age.toFixed(2),warn:h.warn}))}:null;hurt();if(game.stats.misses>misses){const nearby=[],b=game.bullets,indices=b.renderIndices||Array.from({length:b.capacity},(_,i)=>i);for(const i of indices)if(b.active[i]){const dx=b.x[i]-game.player.x,dy=b.y[i]-game.player.y;if(!b.owner[i]&&Math.hypot(dx,dy)<180)nearby.push({kind:b.kind[i],x:+b.x[i].toFixed(1),y:+b.y[i].toFixed(1),distance:+Math.hypot(dx,dy).toFixed(1)});}nearby.sort((a,b)=>a.distance-b.distance);hitRows.push({time:+game.time.toFixed(2),tick:game.tick,wave:game.wave,context,source,player:{x:+game.player.x.toFixed(1),y:+game.player.y.toFixed(1),hp:game.player.hp,bombs:game.player.bombs,energy:+game.player.energy.toFixed(1)},nearbyHostileBullets:nearby.slice(0,8),nearbyEnemies:game.enemies.filter(e=>Math.hypot(e.x-game.player.x,e.y-game.player.y)<300).map(e=>({type:e.type,boss:e.boss,mid:e.mid,x:+e.x.toFixed(1),y:+e.y.toFixed(1),baseX:+e.baseX.toFixed(1),age:+e.age.toFixed(1),aiming:e.aiming,windup:e.windup,charging:e.chargeDone})).slice(0,8)});}};
 for(const [name,method] of [['enemies',game.moveEnemies.bind(game)],['bullets',game.moveBullets.bind(game)],['hazards',game.moveHazards.bind(game)]])game[name==='enemies'?'moveEnemies':name==='bullets'?'moveBullets':'moveHazards']=(dt)=>{context=name;if(name==='bullets')lastRemoved=null;return method(dt);};
 for(let tick=0;tick<120*210&&game.phase==='play';tick++){
  if(tick>=nextInput){input=inputFor(game);nextInput=tick+8;}
  game.update(1/120,input);
  game.drainEvents();
 }
 return{seed:index,clear:!!game.result?.clear,phase:game.phase,seconds:+game.time.toFixed(1),misses:game.stats.misses,graze:game.stats.graze,branch:game.branch,kills:game.stats.kills,firstBoss:game.boss?.name||null,hits:hitRows};
}
const rows=[];
for(let seed=0;seed<count;seed++){
 const before=simulate(loaded.baseline.Game,seed),priorLinePositions=simulate(loaded.priorLinePositions.Game,seed),currentProduct=simulate(loaded.currentProduct.Game,seed),newShapes12px=simulate(loaded.newShapes12px.Game,seed),newShapes24px=simulate(loaded.newShapes24px.Game,seed),newShapes30px=simulate(loaded.newShapes30px.Game,seed),newShapes36px=simulate(loaded.newShapes36px.Game,seed),unstaggered=simulate(loaded.noEntryStagger.Game,seed),allShapes24px=simulate(loaded.allShapes24px.Game,seed);
 rows.push({seed,before,priorLinePositions,currentProduct,newShapes12px,newShapes24px,newShapes30px,newShapes36px,unstaggered,allShapes24px,clearChanged:before.clear!==currentProduct.clear});
 if((seed+1)%10===0)console.log(`paired hit traces ${seed+1}/${count}`);
}
const stats=key=>({clears:rows.filter(r=>r[key].clear).length,meanHits:+(rows.reduce((s,r)=>s+r[key].hits.length,0)/rows.length).toFixed(2),meanGrazes:+(rows.reduce((s,r)=>s+r[key].graze,0)/rows.length).toFixed(1),branchRate:rows.filter(r=>r[key].branch).length});
const summary={n:rows.length,before:stats('before'),currentProduct:stats('currentProduct'),priorLinePositions:stats('priorLinePositions'),newShapes12px:stats('newShapes12px'),newShapes24px:stats('newShapes24px'),newShapes30px:stats('newShapes30px'),newShapes36px:stats('newShapes36px'),noEntryStagger:stats('unstaggered'),allShapes24px:stats('allShapes24px'),regressions:rows.filter(r=>r.before.clear&&!r.currentProduct.clear).map(r=>({seed:r.seed,beforeMisses:r.before.misses,afterMisses:r.currentProduct.misses,beforeSeconds:r.before.seconds,afterSeconds:r.currentProduct.seconds}))};
const output=process.env.SHOOTING_TRACE_OUTPUT||'docs/shooting/qa/formations-v1.4/extreme-damage-hit-trace-50-seeds.json';mkdirSync(output.slice(0,output.lastIndexOf('/')),{recursive:true});writeFileSync(output,JSON.stringify({date:new Date().toISOString(),baseline:`${baselineRef} (v1.3.0)`,difficulty:'extreme',build:process.env.SHOOTING_TRACE_BUILD==='default'?'default starter loadout':'damage-specialist: ship 7, weapon 17 Lv5, support 12 Lv5, power 5, energy 4',sourceHashes,note:'Fixed heuristic pilot, not human play data. Variants are created from one frozen working core source and coordinate fingerprints are asserted for the line and V waves before simulation. priorLinePositions retains new layouts but restores the old straight-line spawn route; noEntryStagger removes staggering from new layouts; allShapes24px applies 24px vertical staging to every shape; newShapes12/24/30/36 apply only to non-line layouts. These analysis variants are not product claims.',summary,rows},null,2));console.log(JSON.stringify(summary,null,2));for(const dir of Object.values(variants))rmSync(dir,{recursive:true,force:true});
