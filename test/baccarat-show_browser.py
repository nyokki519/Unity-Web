"""Browser interactions against production modules; scripted outcomes are QA fixtures only."""
import os,json,shutil,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_SHOW_QA','/tmp/baccarat-show-qa'));out.mkdir(parents=True,exist_ok=True)
fixture='''async ({tier,mode='rich',squeezeMode='important'})=>{
 const {Session}=await import('/baccarat/session.js');const {SessionStore}=await import('/baccarat/storage.js');const {seededRandom}=await import('/baccarat/shoe.js');const {createPresentation}=await import('/baccarat/show-plan.js');
 let session;for(let i=0;i<30000;i++){session=new Session({random:seededRandom(72),decorateRound:r=>createPresentation(r,mode)});session.state.id='qa-show-'+i;session.bet('player',1000);session.confirm();if(session.state.round.presentation.tier===tier)break;}
 if(session.state.round.presentation.tier!==tier)throw Error('fixture');new SessionStore(localStorage).save(session.state);localStorage.removeItem('unity-baccarat-show-v1');localStorage.setItem('unity-baccarat-settings-v1',JSON.stringify({presentation:mode,squeezeMode,bgm:0}));return session.state.round;
}'''
# Use the system ffmpeg in an isolated temporary Playwright cache, when present.
if not os.environ.get('PLAYWRIGHT_BROWSERS_PATH') and shutil.which('ffmpeg'):
 cache=Path(tempfile.gettempdir())/'unity-baccarat-playwright';binary=cache/'ffmpeg-1011'/'ffmpeg-linux';binary.parent.mkdir(parents=True,exist_ok=True)
 if not binary.exists():binary.symlink_to(shutil.which('ffmpeg'))
 os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(cache)
with sync_playwright() as p:
 args=['--no-sandbox']
 if os.environ.get('PROXY_SPKI'):args+=['--ignore-certificate-errors-spki-list='+os.environ['PROXY_SPKI']]
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=args);context=b.new_context(viewport={'width':390,'height':844},has_touch=True,record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():page.wait_for_function('()=>!!window.BACCARAT')
 def load(tier='none',mode='squeeze',squeezeMode='important'):
  page.goto(base+'/baccarat/index.html');ready();r=page.evaluate(fixture,{'tier':tier,'mode':mode,'squeezeMode':squeezeMode});page.reload();ready();page.locator('[data-action=continue]').click();page.locator('[data-action=resume-deal]').click();return r
 def sq():page.locator('#squeeze-dialog[open]').wait_for(timeout=15000)
 r=load();sq();before=page.evaluate('BACCARAT.session.state.round.revealed');assert before==len(r['plan']['cards'])-1
 # Partial card is not added to public scores and does not have an accessible rank.
 side=r['plan']['cards'][-1]['side'];point=page.locator('#points-'+side).inner_text();page.locator('#squeeze-range').fill('45');assert page.locator('#points-'+side).inner_text()==point;assert page.evaluate('BACCARAT.session.state.round.revealed')==before
 page.screenshot(path=str(out/'squeeze-45-390.png'));debit=page.evaluate('BACCARAT.session.state.balance');page.reload();ready();page.locator('[data-action=continue]').click();assert page.evaluate('BACCARAT.session.state.round.revealed')==before;assert page.evaluate('BACCARAT.session.state.balance')==debit;assert page.evaluate('BACCARAT.session.state.round.plan')==r['plan'];page.locator('[data-action=resume-deal]').click();sq();assert page.locator('#squeeze-range').input_value()=='45'
 # Hold and keyboard alternatives retain progress; no forced opening.
 page.locator('[data-show=hold]').click();page.wait_for_timeout(900);assert page.evaluate('BACCARAT.session.state.round.revealed')==before;page.locator('[data-action=resume-deal]').click();sq();page.locator('#squeeze-range').focus();page.keyboard.press('ArrowRight');assert page.locator('#squeeze-range').input_value()=='46';page.keyboard.press('Escape');assert page.locator('[data-action=resume-deal]').is_visible()
 page.locator('[data-action=resume-deal]').click();sq();card=page.locator('.squeeze-card');box=card.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']*.8);page.mouse.down();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']*.6,steps=10);page.mouse.up();assert int(page.locator('#squeeze-range').input_value())>=60
 # Touch drag uses browser input events, not synthetic progress assignments.
 box=card.bounding_box();cdp=context.new_cdp_session(page);x=box['x']+box['width']/2;y=box['y']+box['height']*.7;cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-20}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert int(page.locator('#squeeze-range').input_value())>66
 # Resizing while held does not reveal the card or overlap controls. Japanese and English at 130%.
 for lang in ['ja','en']:
  page.locator('[data-show=hold]').click();page.locator('#settings-link').click();page.locator('[data-setting=language]').select_option(lang);page.locator('[data-setting=text]').select_option('1.3');page.locator('[data-action=back]').click();page.locator('[data-action=resume-deal]').click();sq()
  for width in [375,390,414]:
   page.set_viewport_size({'width':width,'height':844});assert page.locator('html').get_attribute('lang')==lang;assert not page.evaluate('()=>document.documentElement.scrollWidth>innerWidth');assert page.locator('[data-show=full]').bounding_box()['height']>=44
   assert page.locator('.squeeze-actions').bounding_box()['y']>=page.locator('.squeeze-stage').bounding_box()['y']+page.locator('.squeeze-stage').bounding_box()['height'];page.screenshot(path=str(out/f'squeeze-large-{lang}-{width}.png'))
 page.locator('[data-show=full]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'");assert page.evaluate('BACCARAT.session.state.stats.rounds')==1;assert page.evaluate('BACCARAT.session.state.balance===BACCARAT.session.state.round.balanceBefore+BACCARAT.session.state.round.receipt.net');page.screenshot(path=str(out/'neutral-result.png'))
 # All rare tiers are real deterministic plans for a profitable deal, not forced outcomes.
 tiers={}
 for tier in ['blue','green','red','rainbow']:
  r=load(tier);page.wait_for_function('(tier)=>document.querySelector(".felt").dataset.forecast===tier',arg=tier,timeout=15000);sq();assert page.locator('.felt').get_attribute('data-forecast')==tier;page.screenshot(path=str(out/f'{tier}-squeeze.png'));page.locator('[data-show=full]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'");assert page.evaluate('BACCARAT.session.state.round.receipt.net')>0;tiers[tier]=page.evaluate('BACCARAT.session.state.round.presentation');page.screenshot(path=str(out/f'{tier}-result.png'));page.locator('[data-action=next]').click();assert page.locator('.show-sparks').count()==0;assert page.locator('.felt').get_attribute('data-forecast')=='none';page.wait_for_timeout(100)
 # Skip repeatedly even while modal is open => one settlement, no leftover timer.
 load('red',squeezeMode='all');sq();page.locator('[data-show=skip]').click();page.wait_for_timeout(1500);assert page.evaluate('BACCARAT.session.state.stats.rounds')==1;assert page.locator('#squeeze-dialog[open]').count()==0
 # Manual every card, plus explicit auto-opening, and visibility pause / return.
 r=load(squeezeMode='all');sq();page.locator('[data-show=auto]').click();page.wait_for_timeout(250);page.locator('[data-show=auto]').click();v=page.locator('#squeeze-range').input_value();page.wait_for_timeout(250);assert page.locator('#squeeze-range').input_value()==v
 other=context.new_page();other.goto(base+'/baccarat/index.html');other.bring_to_front();page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))") if page.evaluate('()=>document.hidden') else None
 page.bring_to_front();other.close()
 # Escape is deterministic pause even in headless where OS visibility is not modelled.
 if page.locator('#squeeze-dialog[open]').count():page.keyboard.press('Escape')
 assert page.locator('[data-action=resume-deal]').is_visible();page.locator('[data-action=resume-deal]').click();sq();page.locator('[data-show=skip]').click()
 # Reduced-motion bypasses autonomous squeeze animation and all optional cues remain skippable.
 page.emulate_media(reduced_motion='reduce');r=load('rainbow');page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=10000);assert page.locator('#squeeze-dialog[open]').count()==0;assert page.evaluate('BACCARAT.session.state.stats.rounds')==1
 page.emulate_media(reduced_motion='no-preference');load('none','off');page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=10000);assert not page.locator('.show-cutin').count()
 assert not errors,errors
 (out/'report.json').write_text(json.dumps({'fixtureNote':'Controlled seeded QA deals, not production win statistics','tiers':tiers,'partialReload':True,'noEarlyScore':True,'keyboardAndMouse':True,'holdAndAutoStop':True,'mobileWidths':[375,390,414],'skipOnce':True,'reducedMotion':True,'effectsOff':True,'errors':errors},ensure_ascii=False,indent=2));context.close();b.close();print('baccarat presentation browser passed',flush=True)
