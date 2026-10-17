from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os
OUT=Path('docs/qa/cafe-motor');OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in json.loads(os.environ.get('CAFE_VIEWPORTS','[[375,844],[390,844],[414,844],[375,568],[844,390]]')):
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));expect.set_options(timeout=30000)
  try:
   page.goto('http://127.0.0.1:3460/?bonus=jackpot&physics=1',wait_until='domcontentloaded');page.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=45000)
   assert page.get_by_role('button',name='自動連射',exact=True).count()==1,'Missing challenge control'
   expect(page.locator('[data-challenge-funds]')).to_have_text('1,000')
   page.get_by_role('button',name='1球発射',exact=True).click();expect(page.locator('[data-challenge-funds]')).to_have_text('990')
   page.get_by_role('button',name='ランダム威力',exact=True).click();page.get_by_role('button',name='自動連射',exact=True).click()
   page.wait_for_function("()=>Number(document.querySelector('[data-challenge-funds]').textContent.replaceAll(',',''))<990",timeout=30000)
   page.get_by_role('button',name='左へ傾ける',exact=True).dispatch_event('pointerdown',{'button':0,'pointerId':7})
   page.evaluate("window.dispatchEvent(new Event('blur'))")
   expect(page.get_by_role('button',name='自動連射',exact=True)).to_have_attribute('aria-pressed','false')
   expect(page.locator('.abyss-screen')).to_have_attribute('data-phase','paused')
   rect=page.evaluate("""()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{canvas:r('.abyss-machine'),dock:r('.abyss-play-dock'),scroll:document.documentElement.scrollWidth}}""")
   a,d=rect['canvas'],rect['dock'];assert a['bottom']<=d['top']+1 or a['right']<=d['left']+1,rect
   assert d['bottom']<=h and rect['scroll']<=w,rect
   page.screenshot(path=str(OUT/f'play-{w}-{h}.png'),timeout=45000)
   page.get_by_role('button',name='皿3',exact=True).click();expect(page.locator('.abyss-focus-label')).to_contain_text('3段目');page.screenshot(path=str(OUT/f'cradle-{w}-{h}.png'),timeout=45000)
   assert not errors,errors
   rows.append({'width':w,'height':h,'rect':rect,'errors':errors});print('passed',w,h,flush=True)
  except Exception as e:
   rows.append({'width':w,'height':h,'error':str(e),'errors':errors});print('failed',w,h,str(e),flush=True)
  page.close()
 b.close()
(OUT/'controls.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
assert all('error' not in r for r in rows),rows
