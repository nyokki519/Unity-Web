"""Chromium/SwiftShader controlled art scenarios; no physical-device claim."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/art-pass'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ctx=b.new_context(viewport={'width':390,'height':844},record_video_dir=str(out/'sequence-video'),record_video_size={'width':390,'height':844})
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000)
 page.wait_for_function('SHOOTING.renderer.paintedTextures.every(Boolean)',timeout=15000);page.evaluate("SHOOTING.start({seed:'art-pass',difficulty:'easy'})");page.wait_for_timeout(6000);page.screenshot(path=str(out/'after-play-390.png'))
 page.evaluate('''()=>{const g=SHOOTING.game;g.player.invincible=999;g.enemies=[];g.waveCD=999;g.bullets.clear();g.midSpawned=g.bossSpawned=true;g.spawnEnemy(8,240,135,true);SHOOTING.renderer.warning=0;}''')
 page.wait_for_timeout(1000);page.screenshot(path=str(out/'after-boss-390.png'))
 page.evaluate('SHOOTING.game.boss.hp=SHOOTING.game.boss.maxHp*.24');page.wait_for_timeout(500);page.screenshot(path=str(out/'boss-damage-phase-390.png'))
 page.evaluate('SHOOTING.game.bomb()');page.wait_for_timeout(100);page.screenshot(path=str(out/'bomb-anticipation-390.png'));page.wait_for_timeout(180);page.screenshot(path=str(out/'bomb-impact-390.png'));page.wait_for_timeout(650);page.screenshot(path=str(out/'bomb-afterglow-390.png'))
 for stage in range(6):
  page.evaluate('(stage)=>{const g=SHOOTING.game;g.stage=stage;g.enemies=[];g.bullets.clear();g.boss=null;SHOOTING.renderer.warning=0;for(let i=0;i<6;i++)g.spawnEnemy(stage*2+i%2,70+i%3*165,100+Math.floor(i/3)*140);}',stage)
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'stage-{stage}-390.png'))
 page.evaluate('''()=>{const g=SHOOTING.game;g.stage=0;g.enemies=[];g.bullets.clear();g.player.energy=100;g.player.weapon=6;g.waveCD=999;g.player.invincible=999;g.spawnEnemy(8,240,135,true);SHOOTING.renderer.warning=0;}''')
 metrics=page.evaluate('''async()=>{const frames=[];let last=performance.now();for(let i=0;i<120;i++){const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;}frames.sort((a,b)=>a-b);const r=SHOOTING.renderer;return{samples:frames.length,medianMs:frames[60],p95Ms:frames[114],drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,particles:r.particles.length,smoke:r.smokes.length,debris:r.fragments.length,enemyBullets:r.enemyBullets.count,enemyBulletOrder:r.enemyBullets.renderOrder,particleOrder:r.particleMesh.renderOrder};}''')
 assert metrics['enemyBulletOrder']>metrics['particleOrder'],metrics
 page.evaluate('SHOOTING.game.damageEnemy(SHOOTING.game.boss,1e9)');page.wait_for_timeout(400);page.screenshot(path=str(out/'boss-defeat-390.png'));page.wait_for_timeout(1200);page.screenshot(path=str(out/'victory-report-390.png'))
 # Renderer is a read-only consumer of combat state, including its effects timeline.
 page.evaluate('SHOOTING.pause()')
 stable=page.evaluate('''()=>{const g=SHOOTING.game,r=SHOOTING.renderer,before=JSON.stringify(g.snapshot());for(const type of ['shot','item','bomb','explosion','part','laser'])r.event({type,x:240,y:250,boss:type==='explosion'});for(let i=0;i<40;i++)r.render(g);return before===JSON.stringify(g.snapshot());}''');assert stable
 page.evaluate('''()=>{const r=SHOOTING.renderer;r.setReduced(true);r.setQuality('low');r.event({type:'bomb',x:240,y:300});}''');page.wait_for_timeout(300)
 reduced=page.evaluate('''()=>{const r=SHOOTING.renderer;r.render(SHOOTING.game);return{shake:r.shake,flashVisible:r.flashMesh.visible,particles:r.particles.length,smoke:r.smokes.length};}''');assert reduced['shake']==0 and not reduced['flashVisible'],reduced
 page.screenshot(path=str(out/'reduced-effects-390.png'))
 assert not errors,errors
 (out/'art-report.json').write_text(json.dumps({'viewport':[390,844],'runtime':'Linux Chromium / SwiftShader','physicalIPhoneTest':False,'paintedStagesLoaded':6,'raf':metrics,'renderLeavesCombatUnchanged':stable,'reduced':reduced,'errors':errors},indent=2))
 print(json.dumps(metrics));video=page.video;ctx.close();video.save_as(str(out/'after-sequence-390.webm'));video.delete();b.close()
