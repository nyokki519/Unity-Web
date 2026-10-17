from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('SILVER_QA_DIR','docs/qa/silver-ring'));OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in json.loads(os.environ.get('SILVER_VIEWPORTS','[[375,844],[390,844],[414,844],[844,390]]')):
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));expect.set_options(timeout=30000)
  try:
   page.goto(os.environ.get('SILVER_QA_URL','http://127.0.0.1:3461')+'/?bonus=jackpot&seed=silver-browser',wait_until='domcontentloaded');expect(page.locator('iframe.silver-game')).to_have_count(1,timeout=10000)
   frame=page.frame_locator('iframe.silver-game');expect(frame.locator('.ov-title')).to_have_text('喫茶Unity')
   if w==390 and h==844:page.screenshot(path=str(OUT/'start-390-844.png'),timeout=45000)
   frame.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=45000)
   child=page.frames[1];child.wait_for_function("()=>window.SILVER_GAME?.S.phase==='play'",timeout=45000)
   assert child.evaluate("(()=>{const g=SILVER_GAME,m=new g.refs.THREE.Matrix4();g.refs.pinsIM.getMatrixAt(0,m);return Math.abs(m.elements[12]-g.sim.pins[0].x)<1e-6&&Math.abs(m.elements[13]-g.sim.pins[0].y)<1e-6})()"),'Rendered pins must use the seeded physical layout'
   assert child.evaluate('SILVER_GAME.S.muted') is True
   assert child.evaluate('SILVER_GAME.audio.master.gain.value')==0,'Initial audio must be silent at the actual output gain'
   frame.locator('#shotPower').press('ArrowRight');frame.locator('#singleShot').click();assert child.evaluate('SILVER_GAME.S.fired')==1
   assert not frame.locator('#extraControls').is_visible()
   frame.locator('#focusBowl').click();child.wait_for_function("()=>SILVER_GAME.S.manualCamera==='cradle1'");frame.locator('#focusBowl').click();child.wait_for_function("()=>SILVER_GAME.S.manualCamera==='auto'")
   child.evaluate("()=>{const g=SILVER_GAME,text=g.ui.el.toasts.textContent,funds=g.S.funds,gates=g.S.gates;g.sim.emit('foul',{});if(g.S.funds!==funds+100)throw Error('Return must still refund coins');g.sim.emit('gate',{});if(g.ui.el.toasts.textContent!==text)throw Error('Routine events must not post notifications');g.S.funds=funds;g.S.gates=gates;}")
   assert not frame.locator('#hud-tr').is_visible()
   frame.locator('#roundDetails > summary').click();assert frame.locator('#hud-tr').is_visible();frame.locator('#roundDetails > summary').click()
   frame.locator('#moreControls').click();frame.locator('#mRand').click();frame.locator('#mRand').press('Escape');assert not frame.locator('#extraControls').is_visible();assert child.evaluate('SILVER_GAME.S.phase')=='play';frame.locator('#mAuto').click();child.wait_for_function('()=>SILVER_GAME.S.fired>2',timeout=30000)
   page.screenshot(path=str(OUT/f'live-{w}-{h}.png'),timeout=45000)
   child.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden");expect(page.get_by_role('button',name='再開する',exact=True)).to_be_visible();assert child.evaluate('SILVER_GAME.S.auto') is False;expect(frame.locator('#singleShot')).to_be_disabled();expect(frame.locator('#mAuto')).to_be_disabled();child.wait_for_function("()=>SILVER_GAME.audio.ctx.state==='suspended'")
   page.screenshot(path=str(OUT/f'play-{w}-{h}.png'),timeout=45000)
   page.get_by_role('button',name='設定',exact=True).click();page.get_by_label('表示する場所').select_option('cradle1');page.get_by_role('button',name='再開する',exact=True).click()
   child.wait_for_function("()=>SILVER_GAME.audio.ctx.state==='running'");child.evaluate('SILVER_GAME.toBowl(0)');child.wait_for_function("()=>SILVER_GAME.fx.camMode==='CRUUNE'&&SILVER_GAME.fx.detailView",timeout=10000)
   # Settle only the presentation camera in software-rendered QA; do not change physics.
   child.evaluate('()=>{const g=SILVER_GAME;for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false})}');child.wait_for_timeout(500)
   assert child.evaluate('SILVER_GAME.refs.camera.position.z')<1.1
   page.screenshot(path=str(OUT/f'cradle-{w}-{h}.png'),timeout=45000)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   bounds=child.evaluate("()=>{const r=id=>document.getElementById(id).getBoundingClientRect().toJSON();return{fire:r('singleShot'),dock:document.querySelector('.play-dock').getBoundingClientRect().toJSON(),message:r('toasts'),width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth}}")
   assert bounds['fire']['height']>=40 and bounds['dock']['bottom']<=bounds['height']+1 and bounds['scroll']<=bounds['width'],bounds
   assert not errors,errors
   rows.append({'width':w,'height':h,'errors':errors,'fired':child.evaluate('SILVER_GAME.S.fired')});print('passed',w,h,flush=True)
   page.evaluate("window.__silverAudio=document.querySelector('iframe.silver-game').contentWindow.SILVER_GAME.audio.ctx");page.get_by_role('button',name='Unity MIXへ戻る',exact=True).click();expect(page.locator('iframe.silver-game')).to_have_count(0);page.wait_for_function("()=>window.__silverAudio.state==='closed'",timeout=5000)
  except Exception as e:
   try: print('state',page.frames[1].evaluate('()=>({phase:SILVER_GAME.S.phase,auto:SILVER_GAME.S.auto,fired:SILVER_GAME.S.fired,focus:document.hasFocus(),hidden:document.hidden,elapsed:SILVER_GAME.sim.time})'),flush=True)
   except: pass
   rows.append({'width':w,'height':h,'error':str(e),'errors':errors});print('failed',w,h,str(e),flush=True)
  page.close()
 b.close()
report=OUT/'browser.json'
previous=json.loads(report.read_text()) if report.exists() else []
combined={(r['width'],r['height']):r for r in previous+rows}
report.write_text(json.dumps(list(combined.values()),ensure_ascii=False,indent=2))
assert all('error' not in r for r in rows),rows
