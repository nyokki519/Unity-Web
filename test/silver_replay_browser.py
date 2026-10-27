import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_REPLAY_QA_DIR','/tmp/retro-replay-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/silver-ring/index.html?debug=1&seed=replay-qa')
 page.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000);page.locator('#btnStart').click()
 page.evaluate('''async()=>{const g=SILVER_GAME,play=g.replay.play;window.entrySounds=0;const sound=g.audio.replayEntry.bind(g.audio);g.audio.replayEntry=()=>{window.entrySounds++;return sound();};g.replay.play=(track,options)=>{window.replayCutDuration=(track.at(-1).t-track[0].t)/.33+.35;window.savedReplay=track;window.savedReplayOptions=options;return play(track,options);};const {CFG}=await import('/silver-ring/src/config.js'),{holeGeometry}=await import('/silver-ring/src/hole-geometry.js');g.sim.balls.length=0;g.sim.spawnInBowl(2);const ball=g.sim.balls[0],bw=CFG.bowls.list[2],h=holeGeometry(bw,bw.holes.find(h=>h.win));Object.assign(ball,{px:h.x,pz:h.z,pvx:0,pvz:0,holeTime:.03,holeIndex:bw.holes.findIndex(h=>h.win)});window.beforeReplayFunds=g.S.funds;window.replayBall=ball.id;}''')
 page.wait_for_function('()=>SILVER_GAME.replay.active',timeout=60000)
 liveTime=page.evaluate('SILVER_GAME.sim.time');page.wait_for_timeout(200);assert page.evaluate('SILVER_GAME.sim.time')==liveTime
 # Freeze via existing pause control, then render controlled replay times for camera evidence.
 page.evaluate("()=>{window.postMessage({source:'silver-shell',type:'setPaused',value:true},location.origin);}");page.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");page.evaluate('''()=>{window.currentReplayElapsed=SILVER_GAME.replay.elapsed;SILVER_GAME.replay.update(0);}''')
 initial=page.evaluate('SILVER_GAME.sim.time');page.wait_for_timeout(300);assert page.evaluate('SILVER_GAME.sim.time')==initial
 page.evaluate("()=>{document.getElementById('paused').style.display='none';const t=(savedReplayOptions.entryTime-savedReplay[0].t+.1)/.33;SILVER_GAME.replay.update(Math.max(0,t-window.currentReplayElapsed));}")
 for i in range(3):
  if i:page.evaluate('SILVER_GAME.replay.update(window.replayCutDuration)')

  assert page.evaluate('SILVER_GAME.entryFX.root.visible')
  page.evaluate('SILVER_GAME.replay.update(0)')
  assert page.evaluate('window.entrySounds')==i+1
  assert page.locator('#entryReplay').get_attribute('data-angle')==str(i+1)
  page.screenshot(path=str(out/f'angle-{i+1}-390.png'))
 page.evaluate("document.getElementById('paused').style.display=''");page.locator('#resumeGame').click();page.wait_for_function("()=>SILVER_GAME.S.phase==='play'");page.locator('#skipReplay').click();assert not page.evaluate('SILVER_GAME.replay.active')
 page.evaluate("SILVER_GAME.S.phase='play'")
 page.wait_for_timeout(100);assert not page.evaluate('SILVER_GAME.entryFX.root.visible'),'Live burst must not resurrect after replay'
 page.wait_for_function('()=>!SILVER_GAME.S.jackpotLock',timeout=60000)
 assert page.evaluate('SILVER_GAME.S.funds-beforeReplayFunds')==1000000
 assert page.evaluate('SILVER_GAME.S.jacks')==1
 page.evaluate("()=>{SILVER_GAME.replay.play(savedReplay,savedReplayOptions);SILVER_GAME.replay.update(replayCutDuration*3+.01);}");assert not page.evaluate('SILVER_GAME.replay.active')
 for width in [375,414,1280]:
  page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(150)
  page.evaluate("()=>{SILVER_GAME.S.phase='paused';SILVER_GAME.replay.play(savedReplay,savedReplayOptions);SILVER_GAME.replay.update(.1);}")
  box=page.locator('#skipReplay').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=844
  page.screenshot(path=str(out/f'replay-{width}.png'))
  page.evaluate("()=>{SILVER_GAME.replay.finish();SILVER_GAME.S.phase='play';}")
 assert not errors,errors
 (out/'report.json').write_text(json.dumps(dict(widths=[375,390,414,1280],angles=3,entryParticles=True,entrySoundsPerCut=1,pausedSimulation=True,skip=True,payout=1000000,jackpots=1,errors=errors),indent=2))
 print('Replay browser passed: three angles, physics paused, skip, exactly one payout.');b.close()
