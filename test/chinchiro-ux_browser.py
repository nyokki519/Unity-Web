"""User-facing rules recovery and phone controls; actual physics throw, no mocked result."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3482');ap.add_argument('--output',default='docs/qa/ux-audit-chinchiro');a=ap.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in [(375,667),(390,844),(414,896),(1440,1000)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(a.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>!!window.chinchiro?.tray',timeout=60000)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  for link in ['header .brand','header>a:last-child']:assert page.locator(link).bounding_box()['height']>=44
  if w<500:
   box=page.locator('#action').bounding_box();assert box['y']+box['height']<=h,(w,box)
  page.screenshot(path=str(out/f'after-bet-{w}.png'))
  page.locator('#rules-open').click();assert not page.locator('.model-notes').get_attribute('open')
  assert page.locator('.roles li').count()==7
  page.locator('.model-notes summary').click();page.locator('#rules').evaluate('e=>e.scrollTop=e.scrollHeight');page.wait_for_timeout(80)
  close=page.locator('#rules-close').bounding_box();dialog=page.locator('#rules').bounding_box();assert close['y']>=dialog['y'] and close['y']+close['height']<=dialog['y']+dialog['height']
  page.screenshot(path=str(out/f'after-rules-scrolled-{w}.png'));page.locator('#rules-close').click()
  page.locator('[data-bet="50"]').click();assert page.locator('#stake-total').inner_text()=='50 枚'
  page.locator('#action').click();page.locator('#action').click();page.wait_for_function('()=>chinchiro.busy',timeout=10000)
  assert page.locator('#action').inner_text()=='出目を待っています…';assert page.locator('#action').is_disabled()
  page.screenshot(path=str(out/f'after-rolling-{w}.png'));page.wait_for_function('()=>!chinchiro.busy',timeout=60000)
  page.locator('#pause').click();assert page.locator('#pause').inner_text()=='再開';page.locator('#pause').click()
  page.screenshot(path=str(out/f'after-role-{w}.png'))
  assert not errors,errors
  report.append({'width':w,'height':h,'rulesCloseAfterScroll':True,'physicalNotesDisclosed':True,'busyActionLabel':True,'phoneStartVisible':w<500,'touchLinks44px':True,'actualRoll':True,'pauseResume':True,'pageErrors':errors});page.close()
 b.close()
(out/'after-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
