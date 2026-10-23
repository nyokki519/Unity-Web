import test from 'node:test';
import assert from 'node:assert/strict';
import {BallLedger,chooseTicket,paidRounds,openingWindows} from '../public/mechanical/src/economy.js';
import {SeededRandom} from '../public/mechanical/src/random.js';
import {CONFIG,ballMass} from '../public/mechanical/src/config.js';

test('steel sphere mass follows density and radius in SI units',()=>{
 assert.ok(Math.abs(ballMass()-.0054357)<.000001);
 assert.equal(CONFIG.physics.dt,1/240);
});
test('ball stock and active/recovered ledgers conserve every fired ball',()=>{
 const a=new BallLedger(2);
 assert.equal(a.fire(1),true);assert.equal(a.fire(1),false);
 assert.equal(a.fire(2),true);assert.equal(a.fire(3),false);
 assert.equal(a.recover(1,'starter'),true);assert.equal(a.recover(1,'out'),false);
 a.award(5,'starter');assert.equal(a.stock,5);
 assert.equal(a.active.size,1);assert.equal(a.recovered,1);assert.equal(a.valid(),true);
 a.recover(2,'out');assert.equal(a.valid(),true);
 assert.throws(()=>a.award(-1,'bad'));assert.throws(()=>a.award(.2,'bad'));
});
test('electronic tickets are separate from physical V and preserve published detailed split',()=>{
 assert.deepEqual(chooseTicket(1,()=>.002),{rounds:10,long:true});
 assert.deepEqual(chooseTicket(1,()=>.2),{rounds:10,long:false});
 assert.equal(chooseTicket(1,()=>.5).rounds,5);assert.equal(chooseTicket(1,()=>.9).rounds,3);
 assert.equal(chooseTicket(2,()=>.335).rounds,10);assert.equal(chooseTicket(2,()=>.5).rounds,5);
 assert.deepEqual([3,5,10].map(r=>paidRounds(r)*9*14),[252,504,1134]);
 assert.deepEqual(openingWindows(2,false),[[0,.6],[.72,1.32]]);
});
test('random streams replay independently from render frames and electrical selection',()=>{
 const a=new SeededRandom('test'),b=new SeededRandom('test'),c=new SeededRandom('other');
 const av=Array.from({length:20},()=>a.next());assert.deepEqual(av,Array.from({length:20},()=>b.next()));
 assert.notDeepEqual(av,Array.from({length:20},()=>c.next()));assert.ok(av.every(n=>n>=0&&n<1));
});

test('shared machine geometry contains real aperture meshes and unique physical parts',async()=>{
 const {buildMachine,apertureContains}=await import('../public/mechanical/src/geometry.js');
 const machine=buildMachine(CONFIG);
 assert.equal(new Set(machine.parts.map(p=>p.id)).size,machine.parts.length);
 assert.ok(machine.parts.filter(p=>p.role==='pin').length>50);
 assert.ok(machine.parts.some(p=>p.kind==='mesh'&&p.id==='entry-deck'));
 assert.equal(apertureContains({x:0,z:.052},machine.holes[1],CONFIG.ball.radius),true);
 assert.equal(apertureContains({x:.02,z:.052},machine.holes[1],CONFIG.ball.radius),false);
 assert.ok(machine.parts.every(p=>Object.values(p.position).every(Number.isFinite)));
});

test('fixed-step game replays input, uses CCD balls and conserves stock',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 const a=await createGame({seed:'replay'}),b=await createGame({seed:'replay'});
 a.command('power',.8);b.command('power',.8);a.command('fire');b.command('fire');
 assert.ok([...a.physics.balls.values()][0].body.isCcdEnabled());
 let enteredField=false;for(let i=0;i<240;i++){a.step();b.step();for(const ball of a.physics.balls.values()){const p=ball.body.translation();if(p.x<.15&&p.y>.60)enteredField=true;}}
 assert.equal(a.ledger.valid(),true);assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(enteredField,true,'shot should leave the launch groove into the pin field');
 a.dispose();b.dispose();
});
test('physical V throat captures exactly once and starts a separate round state',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 const g=await createGame({seed:'v'});
 g.fixture('v');for(let i=0;i<90;i++)g.step();
 assert.equal(g.stats.v,1);assert.equal(g.phase,'START');assert.equal(g.ledger.valid(),true);
 g.fixture('start');for(let i=0;i<60;i++)g.step();assert.equal(g.phase,'ROUND');
 g.fixture('attacker');for(let i=0;i<60;i++)g.step();assert.equal(g.roundHits,1);
 assert.equal(g.ledger.valid(),true);assert.equal(g.ledger.payout,14);g.dispose();
});
test('magnetic model attracts toward material poles, stays finite and is absent behind release shield',async()=>{
 const {magneticForce}=await import('../public/mechanical/src/mechanisms.js');
 const c=CONFIG,r=c.rotor;
 const f=magneticForce({x:.028,y:r.y,z:r.z+r.radius+.006},0,c);
 assert.ok(f.z<0);assert.ok(Math.hypot(f.x,f.y,f.z)<=c.magnet.force*3);
 const off=magneticForce({x:0,y:r.y+.035,z:r.z-.03},0,c);assert.deepEqual(off,{x:0,y:0,z:0});
});

test('CCD blocks a 12m/s sphere at a visible one-millimetre wall',async()=>{
 const {MachinePhysics,initPhysics}=await import('../public/mechanical/src/physics.js');const {cloneConfig}=await import('../public/mechanical/src/config.js');await initPhysics();const c=cloneConfig();c.physics.gravity=0;
 const p=new MachinePhysics(c,{parts:[{id:'thin-wall',kind:'box',position:{x:.05,y:.1,z:.05},rotation:{x:0,y:0,z:0,w:1},size:[.001,.1,.1],role:'metal',body:'fixed'}]});
 const ball=p.spawn(1,{x:0,y:.1,z:.05},{x:12,y:0,z:0});for(let i=0;i<12;i++)p.step(i*c.physics.dt,{wing:0,attacker:false});assert.ok(ball.body.translation().x<.045);assert.ok(ball.body.linvel().x<0);p.dispose();
});
test('dynamic steel balls collide and reverse their horizontal motion',async()=>{
 const {MachinePhysics,initPhysics}=await import('../public/mechanical/src/physics.js');const {cloneConfig}=await import('../public/mechanical/src/config.js');await initPhysics();const c=cloneConfig();c.physics.gravity=0;c.magnet.enabled=false;const p=new MachinePhysics(c,{parts:[]});
 const a=p.spawn(1,{x:-.02,y:.1,z:0},{x:.6,y:0,z:0}),b=p.spawn(2,{x:.02,y:.1,z:0},{x:-.6,y:0,z:0});for(let i=0;i<25;i++)p.step(i*c.physics.dt,{wing:0,attacker:false});assert.ok(a.body.linvel().x<0&&b.body.linvel().x>0);assert.ok(Math.abs(a.body.translation().x-b.body.translation().x)>.0108);p.dispose();
});
test('held fire and swept auto fire replay from tick-indexed commands',async()=>{
 const {createGame,replaySession}=await import('../public/mechanical/src/game.js');
 const g=await createGame({seed:'held'});g.command('hold',true);for(let i=0;i<400;i++)g.step();g.command('hold',false);g.command('sweep',true);g.command('auto',true);for(let i=0;i<400;i++)g.step();g.command('auto',false);assert.ok(g.ledger.fired>=5);
 const b=await replaySession(g.replayData());assert.deepEqual(b.snapshot(),g.snapshot());g.dispose();b.dispose();
});
test('empty stock terminates even while awaiting a jackpot start',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const {cloneConfig}=await import('../public/mechanical/src/config.js');const c=cloneConfig();c.play.initialBalls=1;const g=await createGame({config:c});g.fixture('v');for(let i=0;i<120;i++)g.step();assert.equal(g.phase,'END');assert.equal(g.ledger.valid(),true);g.dispose();
});

test('closed roof and attacker shed balls instead of storing them forever',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const point of [{x:.03,y:.65,z:.008},{x:.03,y:.17,z:.008}]){const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,point,{x:0,y:-.1,z:0});for(let i=0;i<240*8;i++)g.step();const b=g.physics.balls.get(900);assert.ok(!b||b.body.translation().y<.54,'roof must shed into a route or out');if(b)assert.ok(b.still<2,'closed attacker must not store a ball');g.dispose();}
});

test('fast rotating bat uses swept substeps instead of one coarse pose jump',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();let peak=0;for(let i=0;i<100;i++){g.step();peak=Math.max(peak,g.physics.lastSubsteps||0);}assert.ok(peak>1);assert.ok(peak<=8);assert.ok(Math.abs(g.physics.world.timestep-g.config.physics.dt)<1e-8);g.dispose();
});

test('hypothesized rotating magnet carries a contact ball upwards against gravity',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.fixture('rotor');let high=0;for(let i=0;i<240;i++){g.step();for(const b of g.physics.balls.values())high=Math.max(high,b.body.translation().y);}assert.ok(high>.430,'rotor must actually lift, not merely spin visually');g.dispose();
});

test('rotating magnetic contact carries a ball past the crown toward the release deck',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.fixture('rotor');let released=false;
 for(let i=0;i<240*4;i++){g.step();for(const b of g.physics.balls.values()){const p=b.body.translation();if(p.y>.423&&p.z<.080)released=true;}}
 assert.ok(released,'a lifting rotor must carry past its crown rather than drop the same ball backwards');g.dispose();
});
test('replay preserves rejected rapid fire attempts as attempted inputs',async()=>{
 const {createGame,replaySession}=await import('../public/mechanical/src/game.js');const g=await createGame();g.command('fire');assert.equal(g.command('fire'),false);for(let i=0;i<100;i++)g.step();const r=await replaySession(g.replayData());assert.deepEqual(g.snapshot(),r.snapshot());g.dispose();r.dispose();
});
test('closed lower attacker does not retain a ball that reaches behind its shutter',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:.054,y:.11,z:.008},{x:0,y:-.1,z:0});for(let i=0;i<240*8;i++)g.step();assert.equal(g.physics.balls.has(900),false);g.dispose();
});
test('all paid rounds award only captured balls and finish with exact 252/504/1134 payout',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const rounds of [3,5,10]){const g=await createGame();g.roundTarget=rounds-1;g.phase='START';g.fixture('start');for(let i=0;i<100;i++)g.step();assert.equal(g.phase,'ROUND');
  for(let r=1;r<rounds;r++){for(let hit=0;hit<9;hit++){g.fixture('attacker');for(let i=0;i<60;i++)g.step();}if(r<rounds-1){for(let i=0;i<210;i++)g.step();assert.equal(g.phase,'ROUND');}}
  assert.equal(g.phase,'PLAY');assert.equal(g.ledger.payout,(rounds-1)*9*14);assert.equal(g.ledger.valid(),true);g.dispose();}
});
test('starter entry tolerates the same contact slop as its physical side walls',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const x of [-.174917325,.174917325]){const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x,y:.19,z:.0166586},{x:0,y:-.15,z:0});for(let i=0;i<240*3;i++)g.step();assert.equal(g.stats.starters,1,'ball inside the cup must not rest forever below its sensor');assert.equal(g.physics.balls.size,0);g.dispose();}
});
test('starter capture covers the front lip supported by its shared physical cup',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:-.18,y:.19,z:.06},{x:0,y:-.15,z:0});for(let i=0;i<720;i++)g.step();assert.equal(g.stats.starters,1);assert.equal(g.physics.balls.size,0);g.dispose();
});
test('both admitted entry lanes feed the visible deep mechanism instead of bypassing behind it',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const x of [-.02,.02]){const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x,y:.54,z:.0055},{x:0,y:-.15,z:0});let delivered=false;
  for(let i=0;i<240*8;i++){g.step();for(const b of g.physics.balls.values()){const p=b.body.translation();if(p.y>.28&&p.y<.46&&p.z>.09)delivered=true;}}
  assert.ok(delivered,`entry ${x} must connect to the rotor/bat volume`);g.dispose();}
});
test('outside pins and starter funnel leave a full ball clearance beside launch rail',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const y of [.52,.29]){const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:.215,y,z:.0055},{x:0,y:-.15,z:0});for(let i=0;i<240*8;i++)g.step();assert.equal(g.physics.balls.has(900),false,'no fixed wedge between pins/funnel and launcher divider');g.dispose();}
});
test('visible upper front glass keeps a pin-field ball from escaping forward',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);const b=g.physics.spawn(900,{x:.08,y:.7,z:.008},{x:0,y:0,z:4});let max=0;
 for(let i=0;i<24;i++){g.step();if(g.physics.balls.has(900))max=Math.max(max,b.body.translation().z);}assert.ok(max<.03,'pin field must be physically enclosed by its displayed glass');g.dispose();
});
test('left delivery shelf has a physical cross-slope toward the bat as observed in the video',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:-.110,y:.400,z:.080},{x:0,y:-.1,z:.1});let batLane=false;
 for(let i=0;i<240*5;i++){g.step();for(const b of g.physics.balls.values()){const p=b.body.translation();if(p.x>-.055&&p.y>.29&&p.y<.37)batLane=true;}}assert.ok(batLane,'left delivery must cross toward the bat, not fall off the same left x coordinate');g.dispose();
});
test('motorized bat transfers a ball into actual rotor contact without scripted velocity',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:-.04,y:.318,z:.173},{x:0,y:-.1,z:.1});let touched=false;
 const rotor=g.physics.parts.get('rotor').collider.handle,ball=g.physics.balls.get(900).collider.handle,contact=g.physics.onContact;g.physics.onContact=(a,b)=>{contact(a,b);if((a===rotor&&b===ball)||(b===rotor&&a===ball))touched=true;};
 for(let i=0;i<240;i++)g.step();assert.ok(touched,'a bat stroke must connect to the visible rotor; capture still depends on rotating pole phase');g.dispose();
});
test('slugger shelves physically connect to the actual rotor or three-hole deck',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,{x:.10,y:.52,z:.008},{x:0,y:-.1,z:0});let fed=false;
 const targets=new Set(['rotor','entry-deck'].map(k=>g.physics.parts.get(k).collider.handle));const ball=g.physics.balls.get(900).collider.handle,contact=g.physics.onContact;g.physics.onContact=(a,b)=>{contact(a,b);if((targets.has(a)&&b===ball)||(targets.has(b)&&a===ball))fed=true;};
 for(let i=0;i<240*5;i++)g.step();assert.ok(fed||g.stats.v>0,'right route must join the real rotor/deck, not drop outside its width');g.dispose();
});
test('entry divider and lower start-through join adjoining guides without ball-sized pockets',async()=>{
 const {createGame}=await import('../public/mechanical/src/game.js');
 for(const p of [{x:-.008398,y:.55,z:.0055},{x:-.2024385,y:.31,z:.0055}]){const g=await createGame();g.ledger.fire(900);g.physics.spawn(900,p,{x:0,y:-.1,z:0});for(let i=0;i<240*10;i++)g.step();assert.equal(g.physics.balls.has(900),false,'a static seam must not hold a ball forever');g.dispose();}
});
