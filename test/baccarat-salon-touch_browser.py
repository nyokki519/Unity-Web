"""Real Chromium touch gesture and 80ms action; physical iPhone not covered."""
import os
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
out=Path(os.environ.get('SALON_TOUCH_OUT','/tmp/salon-touch-qa'));out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/baccarat/index.html');page.locator('[data-action=start]').tap();page.locator('[data-action="chip:100"]').tap();page.locator('[data-action="bet:banker"]').tap();page.locator('[data-action=confirm]').tap();expect(page.locator('[data-squeeze=finish]')).to_be_visible(timeout=15000)
 page.evaluate('''()=>{window.tapEvents=[];for(const kind of['pointerdown','pointerup','click','touchstart','touchend'])document.addEventListener(kind,e=>tapEvents.push({kind,target:e.target.closest('[data-action]')?.dataset.action||e.target.className,pointer:e.pointerType}),true);window.touchTypes=[];document.querySelector('.salon-squeeze__stage').addEventListener('pointermove',e=>touchTypes.push(e.pointerType))}''');box=page.locator('.salon-squeeze__stage').bounding_box();x=box['x']+box['width']*.7;y=box['y']+box['height']*.8;scroll=page.evaluate('()=>scrollY');cdp=page.context.new_cdp_session(page)
 def touch(kind,x,y):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y,'radiusX':8,'radiusY':8,'force':1}]})
 touch('touchStart',x,y)
 for i in range(1,10):touch('touchMove',x-12*i/9,y-box['height']*.32*i/9);page.wait_for_timeout(20)
 touch('touchEnd',x,y);progress=page.evaluate('()=>SALON.squeeze.progress');assert 0<progress<1,progress;assert page.evaluate('()=>touchTypes.includes("touch")');assert page.evaluate('()=>scrollY')==scroll;page.screenshot(path=str(out/'squeeze-touch.png'))
 button=page.locator('#salon-squeeze [data-action=skip]').bounding_box();tx=button['x']+button['width']/2;ty=button['y']+button['height']/2;page.wait_for_timeout(250);touch('touchStart',tx,ty);page.wait_for_timeout(80);touch('touchEnd',tx,ty);expect(page.locator('#salon-receipt')).to_be_visible(timeout=10000);assert page.evaluate('()=>SALON.controller.session.state.stats.rounds')==1
 report={'viewport':[390,844],'touchPointer':True,'curlProgress':progress,'pageScrollUnchanged':True,'settledOnce':True,'physicalIPhone':False};(out/'report.json').write_text(json.dumps(report,indent=2));b.close();print(report)
