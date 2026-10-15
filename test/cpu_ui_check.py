"""One real browser plus server CPU participants; no mocked sockets."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3300');p.add_argument('--output',default='/tmp/unity-cpu-qa');p.add_argument('--lobby-only',action='store_true');a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);report=[];errors=[]
 def click(page,name):
  page.get_by_role('button',name=name,exact=True).click();time.sleep(.7)
 def phase(page,value):expect(page.locator('.event-screen')).to_have_attribute('data-phase',value,timeout=10000)
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.url);click(page,'ルームをつくる ↗');page.locator('input[name=name]').fill('ひとりテスト');page.locator('select[name=rounds]').select_option('6');page.locator('form').get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(page.locator('.room-code')).to_be_visible()
  click(page,'CPUを1人追加');expect(page.locator('.player-list li')).to_have_count(2);click(page,'合計6人にする');expect(page.locator('.player-list li')).to_have_count(6);click(page,'合計15人にする');expect(page.locator('.player-list li')).to_have_count(15);expect(page.locator('.player-role').filter(has_text='CPU')).to_have_count(14);expect(page.locator('#cpu-notice')).to_contain_text('CPU14人');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for box in page.locator('.cpu-controls button').all():
   size=box.bounding_box();assert size['width']>=44 and size['height']>=44
  page.screenshot(path=str(out/f'lobby-{width}.png'),full_page=True);page.reload();expect(page.locator('.player-list li')).to_have_count(15);click(page,'合計6人にする');expect(page.locator('.player-list li')).to_have_count(6);click(page,'CPUをすべて削除');expect(page.locator('.player-list li')).to_have_count(1);expect(page.locator('#start-button')).to_be_disabled();expect(page.locator('#cpu-notice')).to_have_count(0);report.append({'width':width,'addRemove':True,'reload':True,'overflow':False})
  if width!=390 or a.lobby_only:page.close();continue
  click(page,'合計6人にする');click(page,'準備できた ✓');page.locator('#start-button').click()
  for mode in ['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK']:
   expect(page.locator('.game-top .eyebrow')).to_contain_text(mode);expect(page.locator('#answered-progress')).to_contain_text('5 / 6',timeout=10000);page.locator('#skip-answer').click() if page.locator('#skip-answer').count() else page.get_by_role('button',name='今回はパスする',exact=True).click();expect(page.locator('.talk-prompt')).to_be_visible(timeout=10000);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('.next-button').click();report.append({'legacyMode':mode,'human':1,'cpu':5,'revealed':True});print('PASS CPU '+mode,flush=True)
  expect(page.get_by_text('OUR MIX',exact=True)).to_be_visible();click(page,'もう一度、MIXする →');expect(page.locator('.player-list li')).to_have_count(6);page.get_by_text('ルーム設定を変更',exact=True).click();page.get_by_label('イベントゲーム',exact=True).select_option('VALUES');expect(page.locator('.room-side p').filter(has_text='価値観ランキング')).to_be_visible();click(page,'準備できた ✓');page.locator('#start-button').click();phase(page,'RULES')
  for game in ['VALUES','WHO','BOUNDARY','QUEST','CAFE','STORY']:
   if game!='VALUES':
    page.get_by_text('司会の管理',exact=True).click();page.get_by_label('切り替えるゲーム',exact=True).select_option(game);click(page,'ゲームを切り替える');click(page,'続ける');phase(page,'RULES')
   page.get_by_text('時間・ラウンド・難易度を設定',exact=True).click();page.locator('input[name=roundLimit]').fill('2')
   if game in ['WHO','STORY']:page.locator('input[name=itemLimit]').fill('1')
   click(page,'設定を保存')
   for rnd in range(2):
    click(page,'回答・相談を始める');phase(page,'CONSULT' if game in ['QUEST','CAFE'] else 'ANSWER');expect(page.locator('#event-status')).to_contain_text('回答 1 / 2チーム' if game in ['QUEST','CAFE'] else '回答 5 / 6人',timeout=10000);expect(page.locator('#event-submit')).to_be_visible();click(page,'今回はパス');click(page,'回答を締め切る');click(page,'回答を公開する')
    if game in ['WHO','STORY']:
     phase(page,'GUESS');expect(page.locator('.event-screen')).to_contain_text('CPUテスト回答');expect(page.locator('#guess-progress')).to_contain_text('予想済み 4人',timeout=6000);click(page,'予想を締め切る');click(page,'正解を公開する');click(page,'次の回答へ')
    phase(page,'TALK');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{game.lower()}-{rnd}.png'),full_page=True);click(page,'ゲームを終了する' if rnd else '次のラウンドへ');phase(page,'FINAL' if rnd else 'RULES')
   report.append({'game':game,'human':1,'cpu':5,'rounds':2,'end':True});print('PASS CPU '+game,flush=True)
  page.close()
 assert not errors,errors;b.close()
(out/'report.json').write_text(json.dumps({'checks':report,'errors':errors},ensure_ascii=False,indent=2));print('PASS CPU UI: single human, mobile controls, persistence and progress')
