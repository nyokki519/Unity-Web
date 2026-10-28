// Controlled, invulnerable benchmark. Not human clear-rate or fun validation.
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.argv[2]||fileURLToPath(new URL('../public/shooting',import.meta.url));
const {Game}=await import(pathToFileURL(root+'/core.js'));
const rows=[];
for(const weapon of [0,1,2])for(const build of ['base','mid','all']){
 const g=new Game({seed:'boss-balance',weapon,difficulty:'normal'}),p=g.player;
 if(build!=='base')Object.assign(p,build==='mid'?{level:4,rapid:2,width:1,options:2,laserBoost:1,missileBoost:1}:{level:8,rapid:5,width:3,options:3,laserBoost:3,missileBoost:3,caliber:3,ricochet:3,orbitLevel:3});
 p.invincible=1e6;g.waveCD=1e9;g.midSpawned=g.bossSpawned=true;const boss=g.spawnEnemy(11,240,135,true,false);
 for(let frame=0;frame<120*90&&g.phase==='play';frame++){g.update(1/120,{fire:true,targetX:boss.x,targetY:575});g.drainEvents();}
 rows.push({weapon,build,seconds:+g.time.toFixed(3),clear:g.result?.clear||false,remainingHp:Math.max(0,boss.hp),parts:g.stats.parts});
}
console.log(JSON.stringify(rows,null,2));
