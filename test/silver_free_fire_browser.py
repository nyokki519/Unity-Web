from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=free-fire');f=page.frame_locator('iframe');assert f.locator('#ruleAir').is_checked();assert not f.locator('#ruleInterference').is_checked();f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000);c=page.frames[1]
 assert c.evaluate("async()=>{const {CFG}=await import('/silver-ring/src/config.js');return CFG.bowls.air.chance===.32&&CFG.shutter.blockRate===0}");f.locator('#mCam').click();assert c.evaluate('SILVER_GAME.S.freeCam')
 c.evaluate('document.activeElement.blur()');before=c.evaluate('SILVER_GAME.S.fired');page.keyboard.press('Space',delay=150);assert c.evaluate('SILVER_GAME.S.fired')>before,'Space must fire while free camera is active'
 c.evaluate('SILVER_GAME.sim.balls.length=0');c.wait_for_function('()=>SILVER_GAME.sim.railClear()',timeout=30000);f.locator('#singleShot').tap();assert c.evaluate('SILVER_GAME.S.fired')>before+1
 c.evaluate('SILVER_GAME.sim.balls.length=0');c.wait_for_function('()=>SILVER_GAME.sim.railClear()',timeout=30000);before=c.evaluate('SILVER_GAME.S.fired');f.locator('#game').tap(position={'x':195,'y':220});assert c.evaluate('SILVER_GAME.S.fired')>before,'Canvas tap must fire in free camera'
 print('free-camera fire passed');b.close()
