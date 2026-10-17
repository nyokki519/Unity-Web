from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os
OUT=Path(__file__).resolve().parents[1]/'docs/qa/jackpot-rebuild';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3460')
out=[]
expect.set_options(timeout=30000)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in json.loads(os.environ.get('JACKPOT_VIEWPORTS','[[375,844],[390,844],[414,844],[375,568],[844,390]]')):
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);page.set_default_timeout(30000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   page.goto(BASE+'/?bonus=jackpot&physics=1',wait_until='domcontentloaded');page.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=45000)
   expect(page.locator('.abyss-screen')).to_have_attribute('data-phase','running',timeout=45000)
   page.get_by_role('button',name='一時停止',exact=True).click()
   page.wait_for_timeout(1500)
   rect=page.evaluate('''() => {const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {canvas:r('.abyss-machine'),dock:r('.abyss-play-dock'),head:r('.abyss-play-head'),viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}}''')
   assert (rect['canvas']['bottom']<=rect['dock']['top']+1 or rect['dock']['bottom']<=rect['canvas']['top']+1 or rect['canvas']['right']<=rect['dock']['left']+1 or rect['dock']['right']<=rect['canvas']['left']+1),rect
   assert rect['scrollWidth']<=w,rect
   assert rect['dock']['bottom']<=h,rect
   page.screenshot(path=str(OUT/f'play-{w}-{h}.png'),timeout=45000)
   page.get_by_role('button',name='皿1',exact=True).click();page.wait_for_timeout(1800)
   expect(page.locator('.abyss-focus-label')).to_contain_text('1段目クルーン')
   page.screenshot(path=str(OUT/f'cradle-{w}-{h}.png'),timeout=45000)
   page.locator('.abyss-advanced > summary').click();page.get_by_text('カメラ・表示・サウンド',exact=True).click();expect(page.get_by_label('動き・点滅を減らす',exact=True)).to_be_visible();page.get_by_label('動き・点滅を減らす',exact=True).check();page.get_by_role('button',name='皿2',exact=True).click();expect(page.locator('.abyss-focus-label')).to_contain_text('2段目クルーン');assert not errors,errors
   out.append({'width':w,'height':h,'rectangles':rect,'errors':errors});print('passed',w,flush=True)
  except Exception as e:out.append({'width':w,'height':h,'error':str(e),'errors':errors});print('failed',w,str(e),errors,flush=True)
  page.close()
 b.close()
(OUT/'ui-report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
assert all('error'not in x for x in out),out
