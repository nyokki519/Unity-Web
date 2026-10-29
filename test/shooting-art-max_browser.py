"""Controlled max-build art/readability fixture; records actual canvas + Web Audio tracks."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/art-pass'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('''(()=>{const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...rest){if(target instanceof AudioDestinationNode){window.__captureAudio??=target.context.createMediaStreamDestination();connect.call(this,window.__captureAudio);}return connect.call(this,target,...rest);};})()''')
 page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000);page.locator('[data-do=quickstart]').click();page.wait_for_timeout(300)
 page.evaluate('''()=>{const g=SHOOTING.game;g.player.invincible=999;g.enemies=[];g.waveCD=999;g.midSpawned=g.bossSpawned=true;g.spawnEnemy(8,240,135,true);g.boss.maxHp=g.boss.hp=1000000;SHOOTING.renderer.warning=0;for(let i=0;i<12;i++)g.collect('P');for(let i=0;i<9;i++){g.collect('S');g.collect('W');g.collect('L');g.collect('M');g.collect('O');g.collect('A');g.collect('Q');g.collect('T');}g.collect('D');g.player.energy=g.player.maxEnergy;g.player.weapon=0;}''')
 page.wait_for_timeout(4000);page.evaluate('SHOOTING.renderer.warning=0');page.screenshot(path=str(out/'max-build-390.png'))
 page.evaluate('''async()=>{const {pattern}=await import('/shooting/patterns.js');const g=SHOOTING.game;g.stage=2;g.boss.hp=g.boss.maxHp*.24;pattern(g,{...g.boss,x:240,y:240},5);pattern(g,{...g.boss,x:240,y:300},3);SHOOTING.renderer.warning=0;}''');page.wait_for_timeout(450);page.screenshot(path=str(out/'max-build-bright-stage-threats-390.png'))
 page.evaluate('''()=>{const video=document.querySelector('canvas').captureStream(25),stream=new MediaStream([...video.getVideoTracks(),...window.__captureAudio.stream.getAudioTracks()]);window.__captureChunks=[];window.__captureRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus',videoBitsPerSecond:1800000});__captureRecorder.ondataavailable=e=>__captureChunks.push(e.data);__captureRecorder.start();}''')
 page.wait_for_timeout(2000);page.evaluate('SHOOTING.game.player.weapon=4');page.wait_for_timeout(1300);page.evaluate('SHOOTING.game.player.weapon=6');page.wait_for_timeout(1300);page.evaluate('SHOOTING.game.bomb()');page.wait_for_timeout(1800)
 recording=page.evaluate('''async()=>{await new Promise(resolve=>{__captureRecorder.onstop=resolve;__captureRecorder.stop();});const bytes=new Uint8Array(await new Blob(__captureChunks,{type:'video/webm'}).arrayBuffer());let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);}''')
 import base64
 (out/'max-build-moving-audio.webm').write_bytes(base64.b64decode(recording))
 report=page.evaluate('''()=>({paintedLoaded:SHOOTING.renderer.paintedTextures.map(Boolean),build:{...SHOOTING.game.player},drawCalls:SHOOTING.renderer.renderer.info.render.calls,enemyBullets:SHOOTING.renderer.enemyBullets.count,allyBullets:SHOOTING.renderer.allyBullets.count,audioTracks:__captureAudio.stream.getAudioTracks().length})''');report['errors']=errors
 assert report['paintedLoaded']==[True]*6 and report['audioTracks']==1 and not errors,report
 (out/'max-build-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
