import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_STAGE_QA_DIR','docs/qa/retro-stage-design'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 rows=[]
 for width in [390,375,414,1280]:
  page=b.new_page(viewport={'width':width,'height':900 if width>900 else 844},has_touch=width<900,reduced_motion='no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/?bonus=jackpot&debug=1&seed=stage-design')
  page.frame_locator('iframe.silver-game').locator('#btnStart').click(timeout=90000);c=page.frames[1];c.wait_for_function('()=>window.SILVER_GAME?.refs.bowlRefs.length===3')
  setup=c.evaluate('''async()=>{
   const g=SILVER_GAME,{CFG}=await import('/silver-ring/src/config.js'),{autoBowlCameraPose}=await import('/silver-ring/src/camera-pose.js');
   g.sim.balls.length=0;g.sim.spawnInBowl(2);g.S.auto=false;g.S.manualCamera='auto';g.S.freeCam=false;
   g.savedStageStep=g.sim.step;g.sim.step=()=>{};const pose=autoBowlCameraPose({height:CFG.bowls.list[2].cy+CFG.machineY,aspect:g.refs.camera.aspect,tier:2});
   g.fx.curPos.set(...pose.position);g.fx.curTgt.set(...pose.target);g.fx.detailView=false;
   return pose;
  }''')
  page.bring_to_front();c.evaluate("()=>{SILVER_GAME.S.phase='play';}");c.wait_for_function("()=>SILVER_GAME.audio.stageFocus&&SILVER_GAME.fx.camMode==='CRUUNE'&&SILVER_GAME.fx.camTier===2",timeout=30000)
  page.wait_for_timeout(350)
  data=c.evaluate('''async()=>{
   const g=SILVER_GAME,{CFG}=await import('/silver-ring/src/config.js'),{bowlSurfaceY}=await import('/silver-ring/src/physics.js'),{autoBowlCameraPose,bowlCameraPose}=await import('/silver-ring/src/camera-pose.js'),T=g.refs.THREE,bw=CFG.bowls.list[2],h=bw.holes.find(x=>x.win),hx=Math.cos(h.a)*bw.ringR,hz=Math.sin(h.a)*bw.ringR;
   g.refs.scene.updateMatrixWorld(true);const rails=[];let bolts=0,edges=0;g.refs.boardG.traverse(o=>{if(o.userData.transferRail)rails.push(o);if(o.userData.mountBolt)bolts++;bolts+=o.userData.mountBoltCount||0;if(o.userData.formedRim)edges++;});
   const camera=g.refs.camera,oldP=camera.position.clone(),oldQ=camera.quaternion.clone();
   const check=pose=>{camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld(true);let blocked=0,total=0;
    for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){if(x*x+z*z>4)continue;const point=g.refs.boardG.localToWorld(new T.Vector3(hx+x*.006,bw.cy+bowlSurfaceY(hx,hz,bw)+.003,bw.cz+hz+z*.006)),v=point.clone().sub(camera.position),ray=new T.Raycaster(camera.position,v.clone().normalize(),0,v.length()-.008);total++;if(ray.intersectObjects(rails,true).length)blocked++;}return{blocked,total};};
   const args={height:bw.cy+CFG.machineY,aspect:camera.aspect},before=check(autoBowlCameraPose(args)),after=check(autoBowlCameraPose({...args,tier:2})),manual=check(bowlCameraPose({...args,pitch:48,yaw:-38}));
   camera.position.copy(oldP);camera.quaternion.copy(oldQ);camera.updateMatrixWorld(true);
   return{before,after,manual,bolts,edges,railCount:rails.length,drawCalls:g.refs.renderer.info.render.calls,triangles:g.refs.renderer.info.render.triangles,focus:g.audio.stageFocus,cameraMode:g.fx.camMode,cameraTier:g.fx.camTier};
  }''')
  assert data['after']['blocked']==0 and data['manual']['blocked']==0,data
  assert data['bolts']==12 and data['edges']==3 and data['railCount']==3,data
  assert data['focus'] and data['cameraMode']=='CRUUNE' and data['cameraTier']==2,data
  page.screenshot(path=str(out/f'stage-{width}.png'))
  if width==390:
   c.locator('#mMute').click()
   audio=c.evaluate('''async()=>{
    const g=SILVER_GAME,a=g.audio,c=a.ctx;g.S.phase='paused';a.setWhisper(false);
    const focused=a.ambientBus.gain.value;a.setStageFocus(false);await new Promise(r=>setTimeout(r,600));const restored=a.ambientBus.gain.value;
    a.ambientBus.gain.cancelScheduledValues(c.currentTime);a.ambientBus.gain.value=0;
    const analyser=c.createAnalyser();analyser.fftSize=1024;a.master.connect(analyser);const pcm=new Float32Array(1024);
    const measure=async(action)=>{let peak=0;action();for(let i=0;i<40;i++){analyser.getFloatTimeDomainData(pcm);for(const n of pcm)peak=Math.max(peak,Math.abs(n));await new Promise(r=>setTimeout(r,3));}return peak;};
    const contactPeak=await measure(()=>a.contact('rim',.5));await new Promise(r=>setTimeout(r,200));const quietPeak=await measure(()=>{});
    const attempts=[],original=a.contact.bind(a);a.contact=(type,v)=>{attempts.push(type);return original(type,v);};
    const s=g.sim,{CFG}=await import('/silver-ring/src/config.js');s.balls.length=0;s.spawnInBowl(2);s.time=1.1;Object.assign(s.balls[0],{px:0,pz:-.012,pvx:0,pvz:-.22});
    for(let i=0;i<24;i++)g.savedStageStep.call(s,1/240);
    s.balls.length=0;s.spawnInBowl(0);s.spawnInBowl(0);Object.assign(s.balls[0],{px:-.024,pz:-.10,pvx:.6,pvz:.12});Object.assign(s.balls[1],{px:.018,pz:-.082,pvx:-.3,pvz:0});s.collideBalls();
    a.setMute(true);await new Promise(r=>setTimeout(r,500));const mutedPeak=await measure(()=>a.contact('pair',1));
    a.master.disconnect(analyser);return{focused,restored,contactPeak,quietPeak,mutedPeak,attempts};
   }''')
   assert audio['focused']<.3 and audio['restored']>.9,audio
   assert .0001<audio['contactPeak']<.95 and audio['quietPeak']<.0001 and audio['mutedPeak']<.0001,audio
   assert 'air' in audio['attempts'] and 'pair' in audio['attempts'],audio
   data['audio']=audio
  assert not errors,errors
  rows.append({'width':width,**data,'errors':errors});page.close()
 (out/'browser.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows));b.close()
