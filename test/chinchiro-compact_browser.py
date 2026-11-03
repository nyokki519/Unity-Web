import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3483');ap.add_argument('--output',default='docs/chinchiro/compact');a=ap.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,667),(390,844),(414,896),(1440,1000)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro?.tray')
  assert '一杯ぶん、勝負しよう。' not in page.locator('body').inner_text();assert not page.locator('.role-area').is_visible()
  r=page.locator('#action').bounding_box()
  if w<500:assert r['y']+r['height']<=h,(w,h,r)
  assert not page.locator('#bet').is_visible();page.locator('.bet-adjust>summary').click();assert page.locator('#bet').is_visible()
  page.locator('#bet').focus();page.keyboard.press('ArrowRight');assert page.locator('#stake-total').inner_text()=='26 枚';page.locator('.bet-adjust>summary').click()
  page.screenshot(path=str(out/f'bet-{w}.png'),full_page=True)
  page.click('#action');r=page.locator('#dice-board').bounding_box()
  if w<500:assert r['y']>=0 and r['y']+r['height']<=h,(w,h,r)
  page.click('#action');page.wait_for_function('()=>chinchiro.busy&&chinchiro.tray.world');r=page.locator('#dice-board').bounding_box()
  if w<500:assert r['y']>=0 and r['y']+r['height']<=h,(w,h,r)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not errors
  rows.append({'width':w,'height':h,'startButtonVisible':w<500,'confirmedBowlVisibleWithoutManualScroll':True,'rollBowlVisible':True,'precisionKeyboard':True,'errors':errors});page.close()
 b.close()
(out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(json.dumps(rows,ensure_ascii=False))
