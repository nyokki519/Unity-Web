"""Host editor, real deadline, moderation and reduced-motion browser checks."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:3102');parser.add_argument('--quick',action='store_true');parser.add_argument('--output',default='/tmp/unity-event-controls');args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);contexts=[browser.new_context(viewport={'width':390,'height':844}) for _ in range(3)];pages=[c.new_page() for c in contexts];host=pages[0];errors=[]
 for page in pages:page.on('pageerror',lambda e:errors.append(str(e)))
 def click(page,name):page.get_by_role('button',name=name,exact=True).click();time.sleep(.15)
 host.goto(args.url);click(host,'ルームをつくる ↗');host.locator('input[name=name]').fill('長い名前のカフェ司会');host.locator('select[name=eventGame]').select_option('WHO');host.locator('form').get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(host.locator('.room-code')).to_be_visible();code=host.locator('.room-code').inner_text()
 for i,page in enumerate(pages[1:]):page.goto(args.url+'/?room='+code);page.locator('input[name=name]').fill('😀参加者'+str(i));click(page,'参加する ↗');expect(page.locator('.room-code')).to_be_visible()
 for page in pages:click(page,'準備できた ✓')
 host.locator('#start-button').click();expect(host.locator('.event-screen')).to_have_attribute('data-phase','RULES')
 host.get_by_text('お題を編集・追加',exact=True).click();host.get_by_label('お題',exact=True).fill('編集したカフェのお題');click(host,'お題の変更を保存');expect(host.get_by_label('今回のお題',exact=True)).to_contain_text('編集したカフェのお題')
 host.get_by_text('お題を編集・追加',exact=True).click();host.get_by_label('お題',exact=True).fill('追加した楽しいお題');click(host,'新しいお題として追加');expect(host.get_by_label('今回のお題',exact=True)).to_contain_text('追加した楽しいお題')
 host.get_by_text('時間・ラウンド・難易度を設定',exact=True).click();host.locator('input[name=seconds]').fill('30');host.locator('input[name=itemLimit]').fill('1');click(host,'設定を保存');expect(host.get_by_text('10〜20分で会話するため、匿名回答はランダムに最大1件を公開します。他の回答は本人だけに表示。司会は開始前に件数を変更できます。',exact=True)).to_be_visible()
 host.get_by_label('動きを減らす',exact=True).check();assert host.evaluate("document.body.classList.contains('reduce-motion')")
 click(host,'回答・相談を始める');pages[1].locator('textarea[name=event-text]').fill('😀'*120);pages[1].locator('#event-submit').click();expect(pages[1].locator('.answer-saved')).to_be_visible();pages[1].reload();expect(pages[1].locator('.answer-saved')).to_be_visible()
 if args.quick:click(host,'回答を締め切る')
 # Real server clock, not a replaced browser timer; other players remain unanswered.
 expect(host.locator('.event-screen')).to_have_attribute('data-phase','CLOSED',timeout=35000);expect(pages[2].locator('.event-screen')).to_have_attribute('data-phase','CLOSED');assert host.get_by_role('button',name='この回答を非表示',exact=True).count()==1
 click(host,'この回答を非表示');click(host,'回答を公開する');expect(host.locator('.event-screen')).to_have_attribute('data-phase','TALK');assert host.locator('.event-story').count()==0
 host.screenshot(path=str(out/'moderated-no-items.png'),full_page=True);
 late_context=browser.new_context(viewport={'width':390,'height':844});late=late_context.new_page();late.goto(args.url+'/?room='+code);late.locator('input[name=name]').fill('会話中の途中参加');click(late,'参加する ↗');expect(late.get_by_role('button',name='次のラウンドの準備OK',exact=True)).to_be_visible();click(late,'次のラウンドの準備OK');
 host.get_by_text('司会の管理',exact=True).click();host.get_by_label('切り替えるゲーム',exact=True).select_option('VALUES');click(host,'ゲームを切り替える');click(host,'続ける');expect(host.locator('.event-screen')).to_have_attribute('data-phase','RULES');click(host,'回答・相談を始める');
 expect(late.locator('#event-submit')).to_be_visible();before=host.locator('.rank-list li').evaluate_all('(items)=>items.map(x=>x.dataset.item)');handle=host.locator('.drag-handle').first;handle.scroll_into_view_if_needed();start=handle.bounding_box();end=host.locator('.rank-list li').nth(2).bounding_box();host.mouse.move(start['x']+start['width']/2,start['y']+start['height']/2);host.mouse.down();host.mouse.move(end['x']+end['width']/2,end['y']+end['height']/2,steps=8);host.mouse.up();after=host.locator('.rank-list li').evaluate_all('(items)=>items.map(x=>x.dataset.item)');assert before!=after,(before,after);host.locator('.rank-controls button').nth(1).click();assert host.locator('.rank-list li').evaluate_all('(items)=>items.map(x=>x.dataset.item)')!=after;host.locator('#event-submit').click();expect(host.locator('.answer-saved')).to_be_visible();
 assert host.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 late_context.close()
 for c in contexts:c.close()
 browser.close()
(out/'report.json').write_text(json.dumps({'editor':True,'addition':True,'realDeadlineSeconds':0 if args.quick else 30,'unanswered':True,'emojiBoundary120':True,'reloadAcceptedAnswer':True,'moderation':True,'reducedMotion':True,'rankPointerAndButtons':True,'lateJoinNextRound':True,'errors':errors},ensure_ascii=False,indent=2));print('PASS event editor, addition, deadline, emoji, reload, moderation, reduced motion',flush=True)
