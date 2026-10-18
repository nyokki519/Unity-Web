from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=free-fire');f=page.frame_locator('iframe');assert f.locator('#ruleAir').is_checked();assert not f.locator('#ruleInterference').is_checked();f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000);c=page.frames[1]
 assert c.evaluate("async()=>{const {CFG}=await import('/silver-ring/src/config.js');return CFG.bowls.air.chance===.32&&CFG.shutter.blockRate===0}");f.locator('#focusBowl').click();f.locator('#mCam').click();assert c.evaluate('SILVER_GAME.S.freeCam')
 c.evaluate('document.activeElement.blur()');before=c.evaluate('SILVER_GAME.S.fired');page.keyboard.press('Space',delay=150);assert c.evaluate('SILVER_GAME.S.fired')>before,'Space must fire while free camera is active'
 c.evaluate('SILVER_GAME.sim.balls.length=0');c.wait_for_function('()=>SILVER_GAME.sim.railClear()',timeout=30000);f.locator('#singleShot').tap();assert c.evaluate('SILVER_GAME.S.fired')>before+1
 c.evaluate('SILVER_GAME.sim.balls.length=0');c.wait_for_function('()=>SILVER_GAME.sim.railClear()',timeout=30000);before=c.evaluate('SILVER_GAME.S.fired');f.locator('#game').tap(position={'x':195,'y':220});assert c.evaluate('SILVER_GAME.S.fired')>before,'Canvas tap must fire in free camera'
 rect=f.locator('#game').bounding_box();cdp=page.context.new_cdp_session(page)
 points=[{'x':rect['x']+140,'y':rect['y']+220,'id':1},{'x':rect['x']+240,'y':rect['y']+260,'id':2}]
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
 for point in points:point['y']+=35
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert c.evaluate('SILVER_GAME.S.freeCam'),'Two-finger gesture after bowl zoom must not exit free camera'
 result=c.evaluate("""()=>{const g=SILVER_GAME,r=g.refs;for(let i=0;i<50;i++){r.camera.position.set(Math.sin(i)*.3,r.controls.target.y+.1,0);g.fx.update(1/60,g.sim,{tension:0,freeCam:true});r.maskBackground();if(r.camera.position.z<.55)throw Error('Camera entered cabinet');if(!Object.values(JSON.parse(r.banknoteRain.layer.dataset.exclusion)).every(Number.isFinite))throw Error('Invalid projected mask');}return{cameraZ:r.camera.position.z,minDistance:r.controls.minDistance,pan:r.controls.enablePan}}""")
 from pathlib import Path
 import json
 out=Path('docs/qa/free-camera-clipping');out.mkdir(parents=True,exist_ok=True);(out/'report.json').write_text(json.dumps({'freeCameraInput':True,'stressPoses':50,**result},indent=2))
 print('free-camera fire and clipping stress passed',result);b.close()
