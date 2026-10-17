"""Real local browser check for the standalone bonus game, no mocked physics."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3400');p.add_argument('--output',default='/tmp/unity-bonus-qa');p.add_argument('--entry-only',action='store_true');a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
report={'widths':[],'errors':[],'roomRequests':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,414]:
  context=b.new_context(viewport={'width':width,'height':844});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('request',lambda r:report['roomRequests'].append(r.url) if '/api/rooms' in r.url or '/ws' in r.url else None)
  page.goto(a.url);entry=page.get_by_role('button',name='喫茶Unityで遊ぶ',exact=True);expect(entry).to_be_visible(timeout=6000)
  if a.entry_only:continue
  entry.click();expect(page.locator('.bonus-screen')).to_be_visible();expect(page.get_by_role('heading',name='琥珀の三段塔',exact=True)).to_be_visible();page.get_by_label('難易度',exact=True).select_option('practice');page.get_by_role('button',name='チャレンジ開始',exact=True).click();expect(page.locator('#bonus-remaining')).to_have_text('100');expect(page.locator('#bonus-sound')).not_to_be_checked()
  page.get_by_label('発射の強さ',exact=True).fill('64');page.get_by_role('button',name='強さを上げる',exact=True).click();expect(page.get_by_label('発射の強さ',exact=True)).to_have_value('69');page.get_by_role('button',name='強さを下げる',exact=True).click()
  page.get_by_role('button',name='1球発射',exact=True).click();expect(page.locator('#bonus-fired')).to_have_text('1');expect(page.locator('#bonus-remaining')).to_have_text('99');page.get_by_role('button',name='一時停止',exact=True).click();before=page.locator('#bonus-elapsed').inner_text();page.wait_for_timeout(350);assert page.locator('#bonus-elapsed').inner_text()==before;page.get_by_role('button',name='再開する',exact=True).click()
  hold=page.get_by_role('button',name='押している間に連続発射',exact=True);hold.scroll_into_view_if_needed();box=hold.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(1100);page.mouse.up();assert int(page.locator('#bonus-fired').inner_text())>=2
  if width==390:
   page.wait_for_timeout(500);count=int(page.locator('#bonus-fired').inner_text());page.locator('canvas').focus();page.keyboard.press('Space');expect(page.locator('#bonus-fired')).to_have_text(str(count+1));page.keyboard.press('ArrowRight');expect(page.get_by_label('発射の強さ',exact=True)).to_have_value('69');page.keyboard.press('ArrowLeft')
   page.wait_for_timeout(500);count=int(page.locator('#bonus-fired').inner_text());page.get_by_role('button',name='1球発射',exact=True).evaluate('b=>{for(let i=0;i<8;i++)b.click()}');expect(page.locator('#bonus-fired')).to_have_text(str(count+1))
   page.evaluate("window.dispatchEvent(new Event('blur'))");expect(page.locator('.bonus-screen')).to_have_attribute('data-phase','paused');expect(page.get_by_role('button',name='再開する',exact=True)).to_be_visible();page.get_by_role('button',name='再開する',exact=True).click()
   page.get_by_label('音を鳴らす（初期OFF）',exact=True).check();page.get_by_label('音を鳴らす（初期OFF）',exact=True).uncheck();count=page.locator('#bonus-fired').inner_text();page.set_viewport_size({'width':414,'height':844});expect(page.locator('#bonus-fired')).to_have_text(count);page.set_viewport_size({'width':390,'height':844});report['keyboardBurstLifecycleEventResizeAudio']=True
  page.get_by_label('動きを減らす',exact=True).check();page.get_by_role('button',name='一時停止',exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.bonus-machine').bounding_box()['y']+page.locator('.bonus-machine').bounding_box()['height']<=page.locator('.bonus-controls').bounding_box()['y']+1;page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/f'game-{width}.png'),full_page=True);report['widths'].append({'width':width,'overflow':False,'hold':True,'pause':True});page.close()
 if not a.entry_only:
  report['naturalWins']=[]
  for mode,seed in [('practice','cafe'),('normal','2'),('hard','26')]:
   page=b.new_page(viewport={'width':390,'height':844});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(a.url+f'/?bonus=jackpot&seed={seed}');expect(page.locator('.bonus-screen')).to_be_visible();page.get_by_label('難易度',exact=True).select_option(mode);page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.get_by_role('button',name='1球発射',exact=True).click();expect(page.locator('#bonus-score')).to_have_text('10000',timeout=15000)
   for stage in [1,2,3]:expect(page.locator(f'#bonus-pass-{stage}')).to_have_text('1')
   page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/f'natural-{mode}.png'),full_page=True);page.get_by_role('button',name='ここで終了',exact=True).click();expect(page.locator('#bonus-result')).to_be_visible();report['naturalWins'].append({'mode':mode,'seed':seed,'allThreeStages':True});page.close()
  page=b.new_page(viewport={'width':390,'height':844});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(a.url+'/?bonus=jackpot&debug=1&seed=qa');expect(page.locator('.bonus-screen')).to_be_visible();page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.get_by_text('検証用の操作',exact=True).click()
  for stage in [1,2,3]:
   page.get_by_label('確認する段',exact=True).select_option(str(stage));page.get_by_role('button',name='当たり穴で落下を確認',exact=True).click();expect(page.locator(f'#bonus-pass-{stage}')).not_to_have_text('0',timeout=5000)
  for stage in [1,2,3]:
   page.get_by_label('確認する段',exact=True).select_option(str(stage));before=page.locator('#bonus-lost').inner_text();page.get_by_role('button',name='外れ穴で落下を確認',exact=True).click();expect(page.locator('#bonus-lost')).not_to_have_text(before)
  expect(page.locator('#bonus-score')).not_to_have_text('0');expect(page.locator('#bonus-test-mark')).to_be_visible();page.get_by_role('button',name='残り玉を0にする',exact=True).click();expect(page.locator('#bonus-result')).to_be_visible(timeout=40000);page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/'result-390.png'),full_page=True);page.get_by_role('button',name='もう一度挑戦',exact=True).click();expect(page.get_by_role('button',name='チャレンジ開始',exact=True)).to_be_visible();report['debugFlow']=True
 assert not report['errors'],report['errors'];assert not report['roomRequests'],report['roomRequests'];b.close()
(out/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS bonus standalone UI',flush=True)
