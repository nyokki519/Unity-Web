"""Phone/desktop navigation QA; synthetic low-balance state checks touch-visible guidance."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_UX_DIR','docs/qa/ux-audit-baccarat'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 results=[]
 for width,height in [(375,812),(390,844),(414,896),(1440,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<600);errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>!!window.SALON')
  page.locator('.salon-title [data-action=settings]').click();page.locator('[data-setting=squeeze]').select_option('off');page.locator('[data-setting=speed]').select_option('quick');page.get_by_role('button',name='閉じる',exact=True).click()
  page.locator('[data-action=start]').click();page.locator('[data-action="bet:banker"]').click();page.locator('[data-action=view-step]').click();page.wait_for_function('()=>document.querySelector("[data-action=confirm]").getBoundingClientRect().bottom<=innerHeight')
  page.locator('[data-action="chip:100"]').click();page.screenshot(path=str(out/f'after-bet-controls-{width}.png'))
  assert page.locator('[data-action=confirm]').evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight'),width
  page.locator('[data-action=confirm]').click();expect(page.locator('#salon-receipt')).to_be_visible(timeout=20000)
  expect(page.locator('[data-action=view-step]')).to_have_text('結果・次のゲームへ ↓')
  page.locator('[data-action=view-step]').click();page.wait_for_timeout(700)
  assert page.locator('[data-action=next]').evaluate('(e)=>e.getBoundingClientRect().top<innerHeight'),width
  page.screenshot(path=str(out/f'after-result-{width}.png'),full_page=True)
  page.locator('.salon-topbar [data-action=history]').click();expect(page.locator('#salon-panel')).to_be_visible();assert page.locator('.salon-road-dot').count()>0
  if width==390:page.screenshot(path=str(out/'after-history-390.png'))
  page.get_by_role('button',name='閉じる',exact=True).click()
  page.evaluate('()=>{const s=SALON.controller.session.state;s.balance=10000;s.lastBet={banker:20000};SALON.result(false)}')
  assert page.locator('[data-action=rebet]').is_disabled();expect(page.locator('#salon-rebet-note')).to_be_visible()
  page.locator('[data-action=next]').click();page.wait_for_timeout(700)
  if width<760:assert page.locator('.salon-betting').evaluate('(e)=>e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight'),width
  assert not page.evaluate('()=>document.documentElement.scrollWidth>innerWidth'),width
  assert not errors,errors
  results.append({'width':width,'roundCompleted':True,'betControlsJump':True,'resultJump':True,'insufficientRebetReason':True,'historyRoads':True,'nextRoundGuidance':True,'errors':errors});page.close()
 browser.close();(out/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('baccarat navigation UX passed:',results)
