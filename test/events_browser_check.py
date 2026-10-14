"""Real independent browser contexts, no realtime mocks. Dedicated server only."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3100');p.add_argument('--output',default='/tmp/unity-event-qa');p.add_argument('--people',type=int,nargs='+',default=[6,15]);args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
games={'VALUES':'価値観ランキング','WHO':'この回答、誰でしょう？','BOUNDARY':'みんなの境界線','QUEST':'共通点クエスト','CAFE':'架空のカフェ会議','STORY':'エピソードの持ち主'}
report={'runs':[],'errors':[]}
def phase(page,value):expect(page.locator('.event-screen')).to_have_attribute('data-phase',value,timeout=10000)
def action(page,name):
 page.get_by_role('button',name=name,exact=True).click()
 time.sleep(.7) # Respect the production per-player operation limit.
def configure(host):
 host.get_by_text('時間・ラウンド・難易度を設定',exact=True).click();host.locator('input[name=roundLimit]').fill('2');action(host,'設定を保存');phase(host,'RULES');expect(host.locator('#event-status')).to_contain_text('/ 2')
def switch(host,key):
 host.get_by_text('司会の管理',exact=True).click();host.get_by_label('切り替えるゲーム',exact=True).select_option(key);action(host,'ゲームを切り替える');action(host,'続ける');phase(host,'RULES');configure(host)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for n in args.people:
  contexts=[browser.new_context(viewport={'width':390,'height':844}) for _ in range(n)];pages=[c.new_page() for c in contexts];host=pages[0];errors=[]
  for page in pages:page.on('pageerror',lambda e:errors.append(str(e)))
  host.goto(args.url);action(host,'ルームをつくる ↗');host.locator('input[name=name]').fill('司会');host.locator('select[name=eventGame]').select_option('VALUES');host.locator('form').get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(host.locator('.room-code')).to_be_visible();code=host.locator('.room-code').inner_text()
  for i,page in enumerate(pages[1:],1):
   page.goto(args.url+'/?room='+code);page.locator('input[name=name]').fill(f'参加者{i}');action(page,'参加する ↗');expect(page.locator('.room-code')).to_be_visible()
  for page in pages:action(page,'準備できた ✓')
  expect(host.locator('#start-button')).to_be_enabled();host.locator('#start-button').click();phase(host,'RULES');configure(host)
  completed=[]
  for key,label in games.items():
   if key!='VALUES':switch(host,key)
   for rnd in range(2):
    phase(host,'RULES');action(host,'回答・相談を始める');expected='CONSULT' if key in ['QUEST','CAFE'] else 'ANSWER'
    for page in pages:phase(page,expected)
    # Leave one participant unanswered in individual games; explicit skip is separate.
    for i,page in enumerate(pages):
     if key in ['QUEST','CAFE'] and not page.locator('#event-submit').is_visible():continue
     if key not in ['QUEST','CAFE'] and i==n-1:continue
     if key in ['WHO','STORY'] and i>1:action(page,'今回はパス');continue
     if key=='VALUES':page.locator('.rank-controls button').nth(1).click()
     elif key=='BOUNDARY':page.locator('input[type=range]').fill(str(i*6))
     elif key=='WHO':page.locator('textarea[name=event-text]').fill(f'匿名の答え{i}：週末はカフェで本を読む')
     elif key=='STORY':
      page.locator('input[name=story-title]').fill(f'新しい街での出会い{i}');page.locator('textarea[name=event-text]').fill('あいうえお'*120)
     elif key=='QUEST':page.locator('textarea[name=event-text]').fill('全員、静かなカフェで読書するのが好き。')
     elif key=='CAFE':
      page.locator('input[name=cafe-name]').fill('木漏れ日のカフェ');page.locator('textarea[name=cafe-concept]').fill('本とゆっくり過ごす場所')
      for field,value in [('location','station'),('menu','food'),('interior','garden')]:page.locator(f'select[name=cafe-{field}]').select_option(value)
      expect(page.locator('.cafe-budget')).to_contain_text('予算超過');expect(page.locator('#event-submit')).to_be_disabled()
      for field,value in [('location','park'),('menu','coffee'),('interior','simple')]:page.locator(f'select[name=cafe-{field}]').select_option(value)
      action(page,'下書きをチームに共有');expect(page.locator('#event-submit')).to_be_enabled()
     page.locator('#event-submit').click();expect(page.locator('.answer-saved')).to_be_visible()
     if rnd==0 and key=='VALUES' and i==1:page.reload();expect(page.locator('.answer-saved')).to_be_visible()
    action(host,'回答を締め切る');phase(host,'CLOSED');action(host,'回答を公開する')
    if key in ['WHO','STORY']:
     for item in range(2):
      for page in pages:phase(page,'GUESS')
      for page in pages:
       if page.locator('#event-vote').count():page.locator('select[name=guess-person]').select_option(index=1);action(page,'予想を送る');expect(page.get_by_text('予想を受理しました。正解公開を待ちましょう。',exact=True)).to_be_visible()
      action(host,'予想を締め切る');phase(host,'GUESS_CLOSED');action(host,'正解を公開する');phase(host,'SOLUTION');action(host,'次の回答へ')
    for page in pages:
     phase(page,'TALK');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(n,key,rnd)
    if key=='QUEST':
     while host.get_by_role('button',name='この共通点を承認',exact=True).count():host.get_by_role('button',name='この共通点を承認',exact=True).first.click();time.sleep(.2)
    host.screenshot(path=str(out/f'{n}-{key}-{rnd}.png'),full_page=True)
    action(host,'次のラウンドへ' if rnd==0 else 'ゲームを終了する');phase(host,'RULES' if rnd==0 else 'FINAL')
   completed.append(key);print(f'PASS {n} contexts {key}: 2 rounds, skips/missing, reveal, end, 390px',flush=True)
  assert not errors,errors
  # Server accepted state survives reload; connection loss is shown and host transfers.
  contexts[0].set_offline(True)
  try:host.reload(timeout=2000)
  except Exception:pass
  expect(pages[1].get_by_text('司会の進行',exact=True)).to_be_visible(timeout=35000);contexts[0].set_offline(False);host.goto(args.url+'/?room='+code);phase(host,'FINAL');assert host.get_by_text('司会の進行',exact=True).count()==0
  report['runs'].append({'people':n,'games':completed,'roundsPerGame':2,'width':390,'hostTakeover':True,'errors':errors})
  (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  for c in contexts:c.close()
 browser.close()
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS independent browser event flows and host takeover',flush=True)
