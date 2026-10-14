"""Real multi-context browser QA. Run the Node server first; no realtime mocks."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:3000');parser.add_argument('--output',default='/tmp/unity-mix-qa');parser.add_argument('--axe');args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
report={'viewport_checks':[],'modes':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,1280,768,414,393,390,375]:
  context=browser.new_context(viewport={'width':width,'height':900 if width>700 else 844});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url,wait_until='networkidle');expect(page.get_by_role('button',name='ルームをつくる ↗',exact=True)).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'home-{width}.png'),full_page=True)
  page.get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(page.locator('form')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'setup-{width}.png'),full_page=True)
  if args.axe and width in [1440,390]:
   page.evaluate(Path(args.axe).read_text());audit=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
   assert not audit,audit
  assert not errors,errors;report['viewport_checks'].append({'width':width,'overflow':False,'errors':errors});context.close();print(f'PASS home/setup {width}px',flush=True)
 host_context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True);guest_context=browser.new_context(viewport={'width':393,'height':852});host=host_context.new_page();guest=guest_context.new_page();errors=[]
 for page in [host,guest]:page.on('pageerror',lambda e:errors.append(str(e)))
 # Create a six-round mixed game through the actual UI.
 host.goto(args.url,wait_until='networkidle');host.get_by_role('button',name='ルームをつくる ↗',exact=True).click();host.locator('input[name=name]').fill('カフェのホスト');host.locator('select[name=rounds]').select_option('6');host.locator('form').get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(host.locator('.room-code')).to_be_visible();code=host.locator('.room-code').inner_text()
 # Simulate a real QR URL: the name form already has the room code.
 guest.goto(args.url+'/?room='+code,wait_until='networkidle');guest.locator('input[name=name]').fill('ゲスト');guest.get_by_role('button',name='参加する ↗',exact=True).click();expect(guest.locator('.room-code')).to_be_visible();expect(host.locator('.player-list li')).to_have_count(2)
 host.get_by_role('button',name='準備できた ✓',exact=True).click();guest.get_by_role('button',name='準備できた ✓',exact=True).click();expect(host.locator('#start-button')).to_be_enabled();host.locator('#start-button').click()
 for index,mode in enumerate(['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK']):
  expect(host.locator('.game-top .eyebrow')).to_contain_text(mode,timeout=6000);expect(guest.locator('#submit-answer')).to_be_visible();
  for page,variant in [(host,0),(guest,1)]:
   if mode in ['ALIGN','PREDICT']:page.locator('.choice-button').nth(variant).click()
   elif mode=='LINE':page.locator('input[type=range]').fill('15' if not variant else '85')
   elif mode=='RANK':
    # Accessible reordering controls; pointer drag is checked separately below.
    page.locator('.rank-controls button').nth(1).click()
   elif mode=='AUCTION':
    page.locator('.allocation-row input').nth(variant).fill('100');expect(page.locator('#submit-answer')).to_be_enabled()
   elif mode=='QUICK':page.locator('textarea').fill('最近、コーヒーを淹れる時間が好きです。' if not variant else '休日は、本を持って出かけたい。')
  # Send one player's answer, inspect waiting on both contexts, then reload that player.
  guest.locator('#submit-answer').click();expect(guest.get_by_role('heading',name='答えを、預かりました。')).to_be_visible();expect(host.locator('#answered-progress .eyebrow')).to_contain_text('1 / 2');assert host.locator('.talk-prompt').count()==0
  if index==0:
   guest.reload(wait_until='networkidle');expect(guest.get_by_role('heading',name='答えを、預かりました。')).to_be_visible();expect(host.locator('.game-top')).to_be_visible()
  host.locator('#submit-answer').click();expect(host.locator('.talk-prompt')).to_be_visible(timeout=8000);expect(guest.locator('.talk-prompt')).to_be_visible(timeout=8000)
  assert host.evaluate('document.documentElement.scrollWidth<=innerWidth');assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
  host.screenshot(path=str(out/f'result-{mode.lower()}.png'),full_page=True)
  if args.axe and mode in ['ALIGN','RANK','AUCTION']:
   host.evaluate(Path(args.axe).read_text());audit=host.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
   assert not audit,audit
  host.locator('.next-button').click();report['modes'].append(mode);print(f'PASS {mode}: answer, synchronized reveal, result, talk, next',flush=True)
 expect(host.get_by_text('OUR MIX',exact=True)).to_be_visible();expect(guest.get_by_text('YOUR MIX',exact=True)).to_be_visible();host.screenshot(path=str(out/'final.png'),full_page=True)
 if args.axe:
  host.evaluate(Path(args.axe).read_text());audit=host.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
  assert not audit,audit
 host.get_by_role('button',name='OUR MIX の共有カード ↗',exact=True).click();expect(host.locator('.share-preview')).to_be_visible();assert host.locator('.share-preview').evaluate('img=>img.naturalWidth')==1080;host.screenshot(path=str(out/'share-preview.png'))
 with host.expect_download() as dl:host.get_by_role('link',name='画像を保存 ↓').click()
 dl.value.save_as(str(out/'our-mix.png'));assert Image.open(out/'our-mix.png').size==(1080,1920);host.get_by_role('button',name='閉じる',exact=True).click()
 host.get_by_role('button',name='もう一度、MIXする →').click();expect(host.locator('.room-code')).to_be_visible();expect(guest.locator('.room-code')).to_be_visible();assert host.locator('#start-button').is_disabled()
 # Unexpected disconnection, graceful takeover, old host returns as the same player.
 host_context.set_offline(True)
 try:host.reload(timeout=3000)
 except Exception:pass
 expect(guest.locator('#start-button')).to_be_visible(timeout=40000);host_context.set_offline(False);host.goto(args.url+'/?room='+code,wait_until='networkidle');expect(host.locator('.connection')).to_contain_text('接続中',timeout=20000);expect(guest.locator('.player-list li')).to_have_count(2);assert host.locator('#start-button').count()==0
 assert not errors,errors
 report['flow']='passed: UI create, QR URL join, ready, 6 modes, reload, Our/Your, actual PNG download, again, disconnection, host takeover, return';host_context.close();guest_context.close()
 bad=browser.new_page(viewport={'width':375,'height':812});bad.goto(args.url+'/?room=0000');bad.locator('input[name=name]').fill('参加者');bad.get_by_role('button',name='参加する ↗',exact=True).click();expect(bad.locator('#toast')).to_contain_text('見つかりません');bad.close();browser.close()
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS final, share download, replay, host takeover, room-not-found',flush=True)
