"""Actual browser integration of geometric lip gravity, periodic wind and rendered positions."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
OUT=Path('docs/qa/retro-physical-lips');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:3461/?bonus=jackpot&debug=1&seed=physical-lips');f=page.frame_locator('iframe.silver-game');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000);c=page.frames[1];c.wait_for_function('()=>window.SILVER_GAME?.refs.boardTex.userData.artwork==="ready"',timeout=90000)
 rows=[]
 for tier in range(3):
  result=c.evaluate('''async(tier)=>{
   const {CFG}=await import('/silver-ring/src/config.js'),{Sim,bowlSurfaceY}=await import('/silver-ring/src/physics.js'),{createRng}=await import('/silver-ring/src/seed.js');const g=SILVER_GAME,s=g.sim;
   g.S.phase='paused';g.S.auto=false;g.S.manualCamera='cradle'+(tier+1);g.S.freeCam=false;g.refs.controls.enabled=false;
   s.balls.length=0;s.spawnInBowl(tier);const ball=s.balls[0],bw=CFG.bowls.list[tier],h=bw.holes[1],hx=Math.cos(h.a)*bw.ringR,hz=Math.sin(h.a)*bw.ringR;
   const nx=Math.cos(h.a),nz=Math.sin(h.a),tx=-nz,tz=nx;
   Object.assign(ball,{px:hx+nx*.032-tx*.04,pz:hz+nz*.032-tz*.04,pvx:tx*.4,pvz:tz*.4,hopY:0,hopV:0});
   const path=[];for(let i=0;i<24;i++){s.step(1/240);path.push({x:ball.px,z:ball.pz,mode:ball.mode});}
   const wind=duty=>{const events=[],sim=new Sim(type=>events.push(type),createRng('wind-browser'));sim.spawnInBowl(2);sim.time=.2;Object.assign(sim.balls[0],{px:0,pz:-.035,pvx:.3,pvz:0,aired:true});CFG.bowls.air.chance=duty;sim.stepBowl(sim.balls[0],1/240);return{v:sim.balls[0].pvz,events};};
   const saved=CFG.bowls.air.chance,on=wind(.32),off=wind(0);CFG.bowls.air.chance=saved;
   return{tier,path,vx:ball.pvx,vz:ball.pvz,radialVelocity:ball.pvx*nx+ball.pvz*nz,mode:ball.mode,on,off,worldY:s.worldPos(ball,[0,0,0])[1],surfaceY:bw.cy+bowlSurfaceY(ball.px,ball.pz,bw,s.bowlAngles[tier])+CFG.ball.r,funds:g.S.funds};
  }''',tier)
  assert result['mode']=='bowl',result
  assert result['radialVelocity']<-.01,result
  assert result['on']['v']-result['off']['v']>.001,result
  assert 'air' in result['on']['events'] and 'air' not in result['off']['events'],result
  assert abs(result['worldY']-result['surfaceY'])<1e-8,result
  c.evaluate('''(tier)=>{const g=SILVER_GAME;g.fx.detailView=true;g.fx.detailPose={pitch:g.S.cameraPitch,yaw:g.S.cameraYaw,zoom:g.S.cameraZoom};g.fx.setCamMode('CRUUNE',tier);for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false});}''',tier)
  # Let the real main loop render the controlled pose once, then pause.
  c.evaluate("""()=>{const g=SILVER_GAME,step=g.sim.step,render=g.refs.renderer.render;window.contactFrameRendered=false;g.sim.step=()=>{};g.refs.renderer.render=function(...args){const output=render.apply(this,args);g.sim.step=step;g.refs.renderer.render=render;g.S.phase='paused';window.contactFrameRendered=true;return output;};g.S.phase='play';}""")
  c.wait_for_function('()=>window.contactFrameRendered',timeout=30000)
  rendered=c.evaluate("""()=>{const g=SILVER_GAME,m=new g.refs.THREE.Matrix4();g.refs.ballsIM.getMatrixAt(0,m);return{count:g.refs.ballsIM.count,matrixY:m.elements[13],worldY:g.sim.worldPos(g.sim.balls[0],[0,0,0])[1],cameraZ:g.refs.camera.position.z}}""")
  assert rendered['count']==1 and abs(rendered['matrixY']-rendered['worldY'])<1e-6,rendered
  assert rendered['cameraZ']<1.2,rendered
  result['rendered']=rendered
  fan=c.evaluate('''async()=>{const g=SILVER_GAME,{CFG}=await import('/silver-ring/src/config.js'),fan=g.refs.bowlRefs[2].fan,old=CFG.bowls.air.chance,time=g.sim.time;CFG.bowls.air.chance=.32;g.sim.time=.2;const before=fan.rotor.rotation.z;g.fx.update(1/60,g.sim,{tension:0,freeCam:false});const on={visible:fan.housing.visible,rotation:fan.rotor.rotation.z-before,light:fan.light.color.g};CFG.bowls.air.chance=0;g.fx.update(1/60,g.sim,{tension:0,freeCam:false});const off=fan.housing.visible;CFG.bowls.air.chance=old;g.sim.time=time;return{on,off};}''')
  assert fan['on']['visible'] and fan['on']['rotation']>.3 and fan['on']['light']>1 and not fan['off'],fan
  result['fan']=fan
  page.screenshot(path=str(OUT/f'lip-stage-{tier+1}.png'),timeout=60000);rows.append(result)
 pair=c.evaluate('''()=>{const g=SILVER_GAME,s=g.sim;s.balls.length=0;s.spawnInBowl(0);s.spawnInBowl(0);const[a,b]=s.balls;Object.assign(a,{px:-.024,pz:-.10,pvx:.6,pvz:.12});Object.assign(b,{px:.018,pz:-.082,pvx:-.3,pvz:0});s.collideBalls();return{a:{x:a.pvx,z:a.pvz},b:{x:b.pvx,z:b.pvz}}}''')
 assert abs(pair['a']['z']-.12)>.03,pair
 assert not errors,errors
 (OUT/'contacts-browser.json').write_text(json.dumps({'controlledContacts':rows,'obliquePair':pair,'errors':errors,'note':'Controlled real simulation/render checks, not natural outcome measurements.'},ensure_ascii=False,indent=2));print('physical lips and wind browser passed');b.close()
