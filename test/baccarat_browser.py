"""Real UI flows and controlled teaching deals; not physical-iPhone certification."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_QA_DIR','/tmp/baccarat-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>!!window.BACCARAT');page.screenshot(path=str(out/'title-390.png'));assert page.locator('[data-action=continue]').is_disabled()
 page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();assert page.evaluate('BACCARAT.session.state.balance')==1000000
 page.locator('[data-action="bet:player"]').tap();page.locator('[data-action="bet:banker"]').tap();assert page.evaluate('Object.keys(BACCARAT.session.state.bets).length')==2
 page.locator('[data-action=confirm]').click();page.evaluate("()=>{for(let i=0;i<20;i++)document.querySelector('[data-action=confirm]').dispatchEvent(new MouseEvent('click',{bubbles:true}))}");assert page.evaluate('BACCARAT.session.state.sequence')==1;plan=page.evaluate('BACCARAT.session.state.round.plan');debit=page.evaluate('BACCARAT.session.state.balance');assert page.evaluate('BACCARAT.session.state.phase')=='dealing'
 page.reload();page.wait_for_function('()=>!!window.BACCARAT');page.locator('[data-action=continue]').click();assert page.locator('[data-action=resume-deal]').is_visible();assert page.evaluate('BACCARAT.session.state.round.plan')==plan;assert page.evaluate('BACCARAT.session.state.balance')==debit
 page.locator('[data-action=resume-deal]').click();page.locator('[data-action=skip]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'")
 assert page.evaluate('BACCARAT.session.state.stats.rounds')==1
 assert page.evaluate('BACCARAT.session.state.balance===BACCARAT.session.state.round.balanceBefore+BACCARAT.session.state.round.receipt.net')
 page.screenshot(path=str(out/'result-390.png'));page.locator('.playing-card.revealed').first.focus();page.keyboard.press('Enter');page.locator('.card-zoom').wait_for();page.keyboard.press('Escape')
 page.locator('[data-action=roads]').click();assert page.locator('#modal').evaluate('(x)=>x.open');page.locator('[data-action=modal-close]').click()
 saved=page.evaluate("localStorage.getItem('unity-baccarat-session-v1')")
 page.locator('[data-action=next]').click();page.locator('[data-action="bet:banker"]').click();page.locator('[data-action=confirm]').click();page.locator('[data-action=end]').click();assert page.evaluate('BACCARAT.session.state.stats.rounds')==2;amount=page.evaluate('BACCARAT.session.state.balance')
 page.locator('[data-action=resume-session]').click();assert page.evaluate('BACCARAT.session.state.balance')==amount
 # Tutorial uses actual buttons and rules against explicitly labelled teaching shoes.
 page.locator('[data-action=end]').click();page.locator('[data-action=title]').click() if page.locator('[data-action=title]').count() else page.locator('[data-action=back]').click()
 before=page.evaluate("localStorage.getItem('unity-baccarat-session-v1')");page.locator('[data-action=tutorial]').click()
 for lesson,side in [(0,'player'),(1,'player'),(2,'banker')]:
  page.locator('[data-action="bet:'+side+'"]').click();page.locator('[data-action=confirm]').click();page.locator('[data-action=skip]').click();assert page.evaluate('BACCARAT.session.state.stats.rounds')==1
  if lesson==0:assert page.evaluate('BACCARAT.session.state.round.plan.natural')
  if lesson==1:assert page.evaluate('BACCARAT.session.state.round.plan.cards.length')==6
  if lesson==2:assert page.evaluate('BACCARAT.session.state.round.receipt.net')==9500
  page.locator('[data-action=next]').click()
 assert page.evaluate("localStorage.getItem('unity-baccarat-session-v1')")==before
 # Display and localization at text size 130%, including all primary screens.
 page.locator('#settings-link').click();page.locator('[data-setting=language]').select_option('en');page.locator('[data-setting=text]').select_option('1.3');assert page.locator('html').get_attribute('lang')=='en'
 page.locator('[data-action=back]').click();page.locator('[data-action="start:lounge"]').click()
 page.locator('#help-link').click();page.locator('[data-action=tutorial]').click();page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.locator('[data-action=skip]').click();page.locator('[data-action=next]').click();page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.locator('[data-action=skip]').click();assert page.locator('.playing-card.revealed').count()==6
 for width,height in [(375,812),(390,844),(414,896),(1280,720),(1920,1080)]:
  page.set_viewport_size({'width':width,'height':height});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,height)
  boxes=page.locator('.bet-zone').evaluate_all('(nodes)=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height}})');assert all(x['w']>=44 and x['h']>=44 for x in boxes)
  assert page.locator('[data-action=next]').bounding_box()['height']>=44
  relation=page.evaluate("()=>({cards:Math.max(...[...document.querySelectorAll('.cards')].map(x=>x.getBoundingClientRect().bottom)),controls:document.querySelector('#bet-console').getBoundingClientRect().top})");assert relation['controls']>=relation['cards'],relation
  page.screenshot(path=str(out/f'table-en-large-{width}.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-action=end]').click();page.locator('[data-action=continue]').click();page.locator('#settings-link').click();page.locator('[data-setting=language]').select_option('ja');page.locator('[data-setting=text]').select_option('1');page.locator('#help-link').click();page.locator('[data-action=back]').click();assert page.evaluate('BACCARAT.page')=='settings';page.locator('[data-action=back]').click();assert page.evaluate('BACCARAT.page')=='game'
 page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.locator('#settings-link').click();tick=page.evaluate('BACCARAT.session.state.round.revealed');page.wait_for_timeout(800);assert page.evaluate('BACCARAT.session.state.round.revealed')==tick
 page.locator('[data-action=back]').click();page.locator('[data-action=resume-deal]').click();page.locator('[data-action=skip]').click()
 # Failure after a valid session must not debit money or silently discard the bet.
 page.locator('[data-action=next]').click();page.locator('[data-action="bet:player"]').click();balance=page.evaluate('BACCARAT.session.state.balance')
 page.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')};return true}");page.locator('[data-action=confirm]').click();assert page.evaluate('BACCARAT.session.state.phase')=='betting';assert page.evaluate('BACCARAT.session.state.balance')==balance
 page.locator('[data-action=no-save]').click();page.locator('[data-action=confirm]').click();page.locator('[data-action=skip]').click();assert page.evaluate('BACCARAT.session.state.stats.rounds')==2
 assert not errors,errors;page.close()
 denied=b.new_page(viewport={'width':390,'height':844});denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})");denied.goto(base+'/baccarat/index.html');denied.wait_for_function('()=>!!window.BACCARAT');denied.locator('[data-action=tables]').click();denied.locator('[data-action="start:lounge"]').click();denied.locator('[data-action="bet:player"]').click();denied.locator('[data-action=confirm]').click();denied.locator('[data-action=skip]').click();assert denied.evaluate('BACCARAT.session.state.stats.rounds')==1
 denied.close();home=b.new_page();home.goto(base+'/');home.get_by_role('link',name='バカラで遊ぶ ↗').wait_for();home.close()
 (out/'report.json').write_text(json.dumps({'midDealReload':True,'exactWallet':True,'normalRounds':True,'tutorialLessons':3,'tutorialDoesNotOverwriteNormal':True,'englishJapanese':True,'text130Percent':True,'widths':[375,390,414,1280,1920],'modalInspectAndRoads':True,'pauseInSettings':True,'storageFailureNoDebit':True,'explicitUnsavedPlay':True,'deniedStoragePlayable':True,'homeLink':True,'errors':errors},indent=2));print('baccarat browser integration passed',flush=True);b.close()
