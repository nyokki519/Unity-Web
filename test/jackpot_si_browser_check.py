"""Integrated ABYSS Chromium QA; software GPU is not mobile hardware validation."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT=Path('docs/qa/jackpot-si');OUT.mkdir(parents=True,exist_ok=True)
report={'widths':[],'errors':[],'checks':{},'limitations':['Chromium SwiftShader on cloud CPU; no iPhone Safari or hardware GPU measurements.']}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 def open_page(width=390,debug=False):
  page=browser.new_page(viewport={'width':width,'height':844},accept_downloads=True)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3400')+'/?bonus=jackpot'+('&debug=1' if debug else ''))
  expect(page.locator('.abyss-screen')).to_be_visible(timeout=10000)
  page.get_by_role('button',name='チャレンジ開始',exact=True).click()
  page.wait_for_timeout(500)
  page.evaluate("document.querySelectorAll('details').forEach(e=>e.open=true)")
  return page
 def btn(page,name):return page.get_by_role('button',name=name,exact=True)
 for width in [375,390,414]:
  page=open_page(width)
  initial=page.evaluate("()=>{const m=document.querySelector('.abyss-machine').getBoundingClientRect(),d=document.querySelector('.abyss-dock').getBoundingClientRect();return {machineBottom:m.bottom,dockTop:d.top}}");assert initial['machineBottom']<=initial['dockTop']
  page.screenshot(path=str(OUT/f'verify-machine-{width}.png'),clip=page.locator('.abyss-machine').bounding_box())
  expect(page.locator('#bonus-sound')).not_to_be_checked()
  btn(page,'1球発射').click();expect(page.locator('#bonus-fired')).to_have_text('1')
  btn(page,'一時停止').click();before=page.locator('#bonus-elapsed').inner_text();page.wait_for_timeout(300);assert page.locator('#bonus-elapsed').inner_text()==before
  btn(page,'再開する').click()
  hold=btn(page,'押している間に連続発射');hold.scroll_into_view_if_needed();box=hold.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(900);page.mouse.up();page.wait_for_timeout(500)
  count=int(page.locator('#bonus-fired').inner_text());assert count>=2
  page.evaluate("window.dispatchEvent(new Event('blur'))");expect(page.locator('.abyss-screen')).to_have_attribute('data-phase','paused');expect(hold).to_have_attribute('aria-pressed','false')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/f'verify-full-{width}.png'),full_page=True)
  geometry=page.evaluate("""()=>{const m=document.querySelector('.abyss-machine').getBoundingClientRect(),d=document.querySelector('.abyss-dock').getBoundingClientRect();return {machine:{top:m.top,bottom:m.bottom},dock:{top:d.top,bottom:d.bottom,position:getComputedStyle(document.querySelector('.abyss-dock')).position},bodyPadding:getComputedStyle(document.querySelector('.abyss-screen')).paddingBottom}}""")
  report['widths'].append({'width':width,'overflow':False,'fireHoldPauseBlur':True,'geometry':geometry,'initialPlay':initial,'fpsBadge':page.locator('.abyss-render-badge').inner_text()})
  btn(page,'ここで終了').click();expect(page.locator('#bonus-result')).to_be_visible();btn(page,'もう一度挑戦').click();expect(btn(page,'チャレンジ開始')).to_be_visible();page.close()
 report['checks']['mobileBasic']=True
 page=open_page()
 btn(page,'1球発射').click();page.wait_for_timeout(300);btn(page,'一時停止').click()
 with page.expect_download() as download:btn(page,'セッションをJSON出力').click()
 session=OUT/'verify-session.json';download.value.save_as(str(session))
 page.locator('input[type=file]').set_input_files(str(session));expect(page.locator('#bonus-message')).to_contain_text('REPLAY')
 btn(page,'1コマ進める').click();btn(page,'リプレイ再生／停止').click();page.wait_for_timeout(500);btn(page,'リプレイ再生／停止').click()
 page.evaluate("window.dispatchEvent(new Event('blur'))");btn(page,'リプレイ再生／停止').click();page.wait_for_timeout(1000);btn(page,'リプレイ再生／停止').click()
 report['checks']['replayBlurResumeNoError']=True
 report['checks']['sessionJSONImportReplayPlayStep']=True
 btn(page,'設定を保存').click();expect(page.locator('#bonus-message')).to_contain_text('保存しました')
 stored=page.evaluate("async()=>{const {loadSettings}=await import('/js/abyss/storage.js');return await loadSettings()}");assert 'config' in stored
 btn(page,'盤面プリセットを保存').click();expect(page.locator('#bonus-message')).to_contain_text('プリセットを保存')
 expect(page.get_by_label('保存した記録',exact=True).locator('option')).not_to_have_count(0)
 btn(page,'選んだ記録を読み込む').click();expect(page.locator('#bonus-message')).to_contain_text('プリセット')
 page.reload();expect(page.locator('.abyss-screen')).to_be_visible();assert page.locator('#abyss-power').input_value()==str(stored['power']);report['checks']['nestedSettingsReloadPresetSaveListRead']=True;page.close()

 browser.close()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
