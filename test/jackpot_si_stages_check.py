import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('docs/qa/jackpot-si')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3400')+'/?bonus=jackpot&debug=1');page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)");page.get_by_label('プレイモード',exact=True).filter(visible=True).select_option('lab')
 checks=[]
 for outcome in ['win','miss']:
  for stage in [1,2,3]:
   page.get_by_label('確認する段',exact=True).select_option(str(stage));target=page.locator(f'#bonus-pass-{stage}' if outcome=='win' else '#bonus-lost');before=target.inner_text();page.get_by_role('button',name='当たり穴で落下を確認' if outcome=='win' else '外れ穴で落下を確認',exact=True).click();expect(target).not_to_have_text(before,timeout=15000);checks.append([stage,outcome,True])
 page.get_by_label('カメラ',exact=True).select_option('cradle3') if page.get_by_label('カメラ',exact=True).count() else None
 page.locator('.abyss-machine').scroll_into_view_if_needed();page.wait_for_timeout(500);page.locator('.abyss-machine').screenshot(path=str(out/'si-detail-390.png'))
 page.get_by_role('button',name='ここで終了',exact=True).click();expect(page.locator('#bonus-result')).to_be_visible();page.get_by_role('button',name='もう一度挑戦',exact=True).click();page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.get_by_label('カメラ',exact=True).select_option('overview');page.wait_for_timeout(500);page.locator('.abyss-machine').screenshot(path=str(out/'si-overview-390.png'))
 (out/'stage-checks.json').write_text(json.dumps({'stages':checks,'errors':errors},indent=2));print(checks,errors);b.close()
