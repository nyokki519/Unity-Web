from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('docs/qa/opaque-frames');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True,device_scale_factor=2);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=opaque-frames');f=page.frame_locator('iframe');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000);c=page.frames[1]
 c.wait_for_function("()=>SILVER_GAME.refs.renderMode==='direct'&&SILVER_GAME.refs.boardTex.userData.artwork==='ready'",timeout=90000)
 attrs=c.evaluate('SILVER_GAME.refs.renderer.getContext().getContextAttributes()');assert attrs['alpha'] is False and attrs['preserveDrawingBuffer'] is True,attrs
 c.evaluate("()=>{window.contextLosses=0;document.getElementById('game').addEventListener('webglcontextlost',()=>contextLosses++);window.frameSample=()=>{const cv=document.createElement('canvas');cv.width=24;cv.height=32;const x=cv.getContext('2d');x.drawImage(document.getElementById('game'),0,0,24,32);const p=x.getImageData(0,0,24,32).data;let colored=0,opaque=0,hash=2166136261;for(let i=0;i<p.length;i++){hash=Math.imul(hash^p[i],16777619);if(i%4===0&&(p[i]+p[i+1]+p[i+2])>10)colored++;if(i%4===3&&p[i]===255)opaque++;}return{colored,opaque,hash:hash>>>0}}}")
 assert 1.3<c.evaluate('SILVER_GAME.fx.curTgt.y')<1.9,'Camera target escaped the cabinet during startup'
 f.locator('#mCam').click();assert c.evaluate('SILVER_GAME.S.freeCam');rect=f.locator('#game').bounding_box();frames=[]
 for i,(dx,dy) in enumerate([(70,20),(-100,35),(120,-50),(-60,10)]):
  page.mouse.move(rect['x']+190,rect['y']+250);page.mouse.down();page.mouse.move(rect['x']+190+dx,rect['y']+250+dy,steps=12);page.mouse.up();c.wait_for_timeout(200)
  assert .5<c.evaluate('SILVER_GAME.refs.controls.target.y')<3,'Free camera lost the cabinet';sample=c.evaluate('frameSample()');assert sample['colored']>150 and sample['opaque']==24*32,sample;sample['pose']=c.evaluate('()=>{const r=SILVER_GAME.refs;return{position:r.camera.position.toArray(),target:r.controls.target.toArray(),direction:r.camera.getWorldDirection(new r.THREE.Vector3()).toArray(),machine:r.machineG.position.toArray(),visible:r.machineG.visible,calls:r.renderer.info.render.calls}}');assert sample['pose']['calls']>50,'Only background is rendered';frames.append(sample)
  page.screenshot(path=str(OUT/f'free-{i}.png'),timeout=60000)
 page.get_by_role('button',name='一時停止',exact=True).click();c.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");c.wait_for_timeout(100);before=c.evaluate('frameSample()');c.wait_for_timeout(700);after=c.evaluate('frameSample()');assert before==after and after['colored']>150,{'before':before,'after':after}
 assert c.evaluate('contextLosses')==0;assert not errors,errors
 (OUT/'report.json').write_text(json.dumps({'alpha':attrs['alpha'],'preserveDrawingBuffer':attrs['preserveDrawingBuffer'],'renderMode':'direct','frames':frames,'pausedFrameRetained':True,'contextLosses':0,'errors':errors},indent=2));print('opaque free-camera frames and paused retention passed',frames);b.close()
