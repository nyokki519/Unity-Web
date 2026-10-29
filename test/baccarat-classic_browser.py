"""Real source-style controls, interruption and exact financial state."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');out=Path(os.environ.get('CLASSIC_QA','/workspace/scratch/baccarat-classic-qa'));out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/baccarat/index.html');expect(page.locator('#classic-stage canvas')).to_be_visible(timeout=5000)
 page.locator('[data-classic=start]').click();expect(page.locator('[data-classic="bet:player"]')).to_be_visible();page.locator('[data-classic="bet:player"]').tap();assert page.evaluate('()=>Object.keys(CLASSIC.controller.session.state.bets).length')==0
 page.locator('[data-classic="chip:100"]').tap();assert page.evaluate('()=>CLASSIC.controller.session.state.bets.player')==10000
 page.evaluate('()=>{const s=CLASSIC.controller.session.state,cards=[25,14,16,29,9];s.shoe.order=[...cards,...s.shoe.order.filter(c=>!cards.includes(c))];s.shoe.cursor=s.shoe.burn=0;}')
 page.locator('[data-classic=deal]').dblclick();expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible(timeout=12000);assert page.evaluate('()=>CLASSIC.controller.session.state.stats.rounds')==1;page.screenshot(path=str(out/'result-390.png'),full_page=True);page.get_by_role('button',name='いいえ',exact=True).click();expect(page.locator('[data-classic=deal]')).to_be_disabled();assert page.evaluate('()=>CLASSIC.controller.session.state.phase')=='betting'
 for w,h in [(375,812),(390,844),(414,896)]:
  page.set_viewport_size({'width':w,'height':h});page.reload();page.locator('[data-classic=start]').click();page.wait_for_timeout(120);assert not page.evaluate('()=>document.documentElement.scrollWidth>innerWidth+1');page.screenshot(path=str(out/f'betting-{w}.png'),full_page=True);page.screenshot(path=str(out/f'viewport-{w}.png'))
 pc=b.new_page(viewport={'width':1920,'height':1080});pc.goto(base+'/baccarat/index.html');pc.locator('[data-classic=start]').click();pc.screenshot(path=str(out/'betting-1920.png'),full_page=True);pc.close()
 balance=page.evaluate('()=>CLASSIC.controller.session.state.balance');page.reload();page.locator('[data-classic=start]').click();assert page.evaluate('()=>CLASSIC.controller.session.state.balance')==balance;assert page.evaluate('()=>CLASSIC.controller.session.state.stats.rounds')==1
 assert not errors,errors;(out/'report.json').write_text(json.dumps({'viewports':[375,390,414,1920],'balance':balance,'errors':errors},indent=2));b.close()
print('source-style betting, third, repeat, reload and viewports passed')
