"""Records a controlled real-canvas comparison of the six route-boss motions."""
from pathlib import Path
import base64, json, os
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/formations-v1.4'))
out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000)
    page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>!!SHOOTING.game',timeout=30000)
    page.evaluate('''()=>{const g=SHOOTING.game;g.waveCD=1e9;g.enemies=[];g.player.invincible=1e9;g.player.hp=g.player.maxHp;g.player.weapon=0;SHOOTING.profile.settings.autofire=false;const e=g.spawnEnemy(11,240,-70,true,false);e.hp=e.maxHp=1e9;window.__routeBoss=e;}''')
    page.wait_for_timeout(2600)
    page.evaluate('SHOOTING.renderer.warning=0;SHOOTING.renderer.hudKey="";SHOOTING.renderer.render(SHOOTING.game,1)')
    page.screenshot(path=str(out/'route-boss-motion-stage-0-390.png'))
    page.evaluate('''()=>{const video=document.querySelector('canvas').captureStream(25);window.__bossChunks=[];window.__bossRecorder=new MediaRecorder(video,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1600000});__bossRecorder.ondataavailable=e=>__bossChunks.push(e.data);__bossRecorder.start();window.__bossStageTimer=setInterval(()=>{const g=SHOOTING.game;g.stage=(g.stage+1)%6;window.__routeBoss.age=0;},1800);}''')
    page.wait_for_timeout(11000)
    data=page.evaluate('''async()=>{clearInterval(window.__bossStageTimer);await new Promise(resolve=>{__bossRecorder.onstop=resolve;__bossRecorder.stop();});const bytes=new Uint8Array(await new Blob(__bossChunks,{type:'video/webm'}).arrayBuffer());let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);}''')
    (out/'route-boss-motion-6-routes-390.webm').write_bytes(base64.b64decode(data))
    report=page.evaluate('''()=>({viewport:[innerWidth,innerHeight],bossesSeen:SHOOTING.game.bossesSeen.size,position:{x:window.__routeBoss.x,y:window.__routeBoss.y},drawCalls:SHOOTING.renderer.renderer.info.render.calls})''')
    report['errors']=errors
    assert report['viewport'][0]==390 and report['position']['x']>=90 and report['position']['x']<=390 and not errors,report
    (out/'route-boss-motion-browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report));browser.close()
