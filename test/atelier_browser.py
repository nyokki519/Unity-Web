from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path('docs/qa/atelier');OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844},has_touch=True,device_scale_factor=1)
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto('http://127.0.0.1:3461/atelier/index.html?seed=1701',wait_until='domcontentloaded');page.wait_for_function('()=>window.ATELIER?.view&&document.getElementById("loading").hidden',timeout=90000)
  assert page.locator('body').evaluate('(el)=>el.scrollWidth<=innerWidth'),'horizontal overflow'
  assert page.locator('#remaining').inner_text()=='20'
  assert page.locator('#sound').get_attribute('aria-pressed')=='false'
  assert page.evaluate('ATELIER.view.renderer.getContext().getContextAttributes().alpha') is False
  page.screenshot(path=str(OUT/f'start-{width}.png'),full_page=True,timeout=60000)
  page.locator('#launch').tap();page.wait_for_function('()=>ATELIER.sim.launched===1')
  assert page.locator('#remaining').inner_text()=='19'
  page.evaluate('()=>{for(let i=0;i<240*40&&ATELIER.sim.balls.size;i++)ATELIER.sim.step()}')
  page.wait_for_function('()=>ATELIER.sim.results.length===1')
  page.locator('#pause').click();assert page.evaluate('ATELIER.paused');before=page.evaluate('ATELIER.sim.time');page.wait_for_timeout(100);assert page.evaluate('ATELIER.sim.time')==before
  page.locator('#resume').click();assert not page.evaluate('ATELIER.paused')
  page.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden")
  assert page.evaluate('ATELIER.paused');page.locator('#resume').click()
  page.locator('#restart').click();assert page.locator('#remaining').inner_text()=='20';assert page.evaluate('ATELIER.sim.launched')==0
  if width==375:
   # Regression for duplicate pointerdown leaking a long-press timer.
   page.evaluate("""()=>{window.holdTimers=new Set();const set=window.setInterval.bind(window),clear=window.clearInterval.bind(window);window.setInterval=(...args)=>{const id=set(...args);holdTimers.add(id);return id};window.clearInterval=id=>{holdTimers.delete(id);clear(id)};const b=document.getElementById('launch');window.savedCapture=b.setPointerCapture;b.setPointerCapture=()=>{}}""")
   page.locator('#launch').dispatch_event('pointerdown',{'button':0,'pointerId':1})
   page.locator('#launch').dispatch_event('pointerdown',{'button':0,'pointerId':2})
   assert page.evaluate('holdTimers.size')==1,'only one hold timer may exist'
   page.dispatch_event('body','pointerup',{'pointerId':1})
   assert page.evaluate('holdTimers.size')==0,'release must clear every hold timer'
   page.evaluate("()=>{document.getElementById('launch').setPointerCapture=window.savedCapture;}")
   page.locator('#restart').click()
  page.locator('#power').fill('75');assert page.locator('#power-value').inner_text()=='75%'
  page.locator('#launch').tap();page.locator('#scene').scroll_into_view_if_needed();page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'playing-{width}.png'),full_page=True,timeout=60000)
  # Controlled outcomes verify the actual UI result/retry lifecycle, separately from natural launches.
  page.evaluate('()=>{const s=ATELIER.sim;s.remaining=0;for(const ball of s.balls.values()){s.world.removeRigidBody(ball.body);}s.balls.clear();}')
  page.wait_for_function('()=>ATELIER.finished');assert page.locator('#result').is_visible();page.locator('#retry').click();assert page.evaluate('ATELIER.sim.remaining')==20
  rows.append({'width':width,'errors':errors,'shot':True,'pause':True,'visibility':True,'retry':True,'opaque':True,'results':page.evaluate('ATELIER.sim.results.length'),'holdTimerRegression':width==375});assert not errors
  page.close()
 page=b.new_page(viewport={'width':390,'height':844});page.add_init_script("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true})");page.goto('http://127.0.0.1:3461/atelier/index.html');page.wait_for_function('()=>window.ATELIER?.paused',timeout=90000);assert page.locator('#pause-cover').is_visible();page.evaluate('delete document.hidden');page.locator('#resume').click();assert not page.evaluate('ATELIER.paused');page.close()
 page=b.new_page();page.goto('http://127.0.0.1:3461/');page.get_by_role('link',name='ATELIERを遊ぶ ↗').wait_for();assert page.get_by_role('button',name='喫茶Unityで遊ぶ').is_visible();page.close();b.close()
(OUT/'browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('atelier browser passed',rows)
