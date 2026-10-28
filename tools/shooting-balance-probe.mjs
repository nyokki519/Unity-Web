// Controlled, invulnerable benchmark. Not human clear-rate or fun validation.
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.argv[2]||fileURLToPath(new URL('../public/shooting',import.meta.url)),{Game}=await import(pathToFileURL(root+'/core.js')),{shootPlayer}=await import(pathToFileURL(root+'/combat.js'));
const rows=[];
for(const weapon of Array.from({length:20},(_,i)=>i))for(const build of ['base','mid','full','all']){
 const g=new Game({seed:'balance',weapon}),p=g.player;g.input={fire:true};
 if(build!=='base')Object.assign(p,build==='mid'?{level:4,rapid:2,width:1,options:2,laserBoost:1,missileBoost:1}:{level:8,rapid:5,width:3,options:3,laserBoost:3,missileBoost:3});
 if(build==='all')Object.assign(p,{caliber:3,ricochet:3,orbitLevel:3});
 const target=g.spawnEnemy(0,240,weapon===14?500:210);target.hp=target.maxHp=1e8;target.r=55;let generated=0;
 for(let i=0;i<2400;i++){g.tick++;g.time+=1/120;p.energy=Math.min(p.maxEnergy,p.energy+10/120);shootPlayer(g,1/120);g.moveBullets(1/120);g.moveHazards(1/120);g.drainEvents();generated=Math.max(generated,g.bullets.count);}
 rows.push({weapon,build,dps:+((1e8-target.hp)/20).toFixed(2),peakBullets:generated});
}
console.log(JSON.stringify(rows,null,2));
