"""Regression evidence for SI-2: portrait framing and all physical aperture outcomes."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('docs/qa/jackpot-flow');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3400');report={'widths':[],'outcomes':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(base+'/?bonus=jackpot&physics=1&debug=1');page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)");page.get_by_label('プレイモード',exact=True).filter(visible=True).select_option('lab')
  for stage in [1,2,3]:
   page.get_by_role('button',name=f'皿{stage}',exact=True).click();page.get_by_label('確認する段',exact=True).select_option(str(stage));page.get_by_role('button',name='皿の縁から投入',exact=True).click();page.locator('.abyss-machine').scroll_into_view_if_needed();page.wait_for_timeout(1000);page.locator('.abyss-machine').screenshot(path=str(out/f'cradle-{stage}-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  report['widths'].append({'width':width,'overflow':False,'quickViews':True});page.close()
 page=b.new_page(viewport={'width':390,'height':844});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(base+'/?bonus=jackpot&physics=1&debug=1');page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)");page.get_by_label('プレイモード',exact=True).filter(visible=True).select_option('lab')
 for outcome in ['win','miss']:
  for stage in [1,2,3]:
   page.get_by_label('確認する段',exact=True).select_option(str(stage));target=page.locator(f'#bonus-pass-{stage}' if outcome=='win' else '#bonus-lost');before=target.inner_text();page.get_by_role('button',name='当たり穴で落下を確認' if outcome=='win' else '外れ穴で落下を確認',exact=True).click();expect(target).not_to_have_text(before,timeout=15000);report['outcomes'].append([stage,outcome,True])
 b.close()
assert not report['errors'],report['errors']
(out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report)
