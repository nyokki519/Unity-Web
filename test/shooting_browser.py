import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('SHOOTING_QA_DIR','/tmp/shooting-browser'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000)
 page.screenshot(path=str(out/'title-390.png'))
 page.locator('[data-do=workshop]').first.click();page.locator('[data-do="tab:weapon"]').click();assert page.locator('.card').count()==20
 # Controlled resources for actual workshop purchase/development, not claimed earned gameplay.
 page.evaluate('''()=>{const p=SHOOTING.profile;p.credits=5000;p.materials.common=20;SHOOTING.navigate('workshop');}''')
 page.locator('[data-do="tab:weapon"]').click();page.locator('[data-do="develop:weapon:0"]').click();assert page.evaluate('SHOOTING.profile.weaponLevels[0]')==1;assert page.evaluate('SHOOTING.profile.credits')==4600
 page.reload();page.wait_for_function('()=>!!window.SHOOTING',timeout=90000);assert page.evaluate('SHOOTING.profile.weaponLevels[0]')==1
 page.locator('[data-do=hangar]').first.click();page.locator('[data-do=launch]').click();page.wait_for_function('()=>SHOOTING.game?.tick>15',timeout=30000)
 page.bring_to_front();page.evaluate('SHOOTING.resume()');page.evaluate('window.beforeMove=SHOOTING.game.player.x');page.keyboard.down('ArrowRight');page.wait_for_function('()=>SHOOTING.game.player.x>window.beforeMove+5',timeout=15000);page.keyboard.up('ArrowRight')
 # Real browser touch drag and held manual fire, separate from keyboard.
 rect=page.locator('#canvas').bounding_box();cdp=page.context.new_cdp_session(page);startx=page.evaluate('SHOOTING.game.player.x')
 point={'x':rect['x']+rect['width']*.65,'y':rect['y']+rect['height']*.85,'id':1}
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]});point['x']-=35;cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point]});page.wait_for_function(f'()=>SHOOTING.game.player.x<{startx}-5',timeout=15000);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('SHOOTING.game.player.x')<startx-5
 page.evaluate('SHOOTING.profile.settings.autofire=false');shots=page.evaluate('SHOOTING.game.stats.shots');box=page.locator('[data-action=fire]').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_function(f'()=>SHOOTING.game.stats.shots>{shots}',timeout=15000);page.mouse.up();page.evaluate('SHOOTING.profile.settings.autofire=true')
 focus=page.locator('[data-action=focus]');focus.tap();assert focus.get_attribute('aria-pressed')=='true'
 page.evaluate('''()=>{SHOOTING.pause();window.expected=JSON.stringify(SHOOTING.game.snapshot());window.expectedStats=JSON.stringify(SHOOTING.game.stats);window.expectedTick=SHOOTING.game.tick;window.beforeReplayCredits=SHOOTING.profile.credits;}''')
 page.wait_for_timeout(200);assert page.evaluate('SHOOTING.game.tick')==page.evaluate('window.expectedTick')
 bombs=page.evaluate('SHOOTING.game.player.bombs');page.keyboard.press('x');page.locator('[data-do=resume]').click();page.wait_for_function('()=>SHOOTING.game.tick>window.expectedTick+3',timeout=30000);assert page.evaluate('SHOOTING.game.player.bombs')==bombs
 page.evaluate('''()=>{SHOOTING.pause();window.expected=JSON.stringify(SHOOTING.game.snapshot());window.expectedStats=JSON.stringify(SHOOTING.game.stats);}''')
 page.locator('[data-do=abandon]').click();page.evaluate("SHOOTING.navigate('title')");page.locator('[data-do=replay]').click()
 page.wait_for_function('()=>SHOOTING.replaying&&SHOOTING.paused',timeout=60000)
 assert page.evaluate('JSON.stringify(SHOOTING.game.snapshot())===window.expected'),page.evaluate('({actual:SHOOTING.game.snapshot(),expected:JSON.parse(expected)})')
 assert page.evaluate('JSON.stringify(SHOOTING.game.stats)===window.expectedStats');assert page.evaluate('SHOOTING.profile.credits')==page.evaluate('window.beforeReplayCredits')
 print('workshop, persistence, controls and exact replay passed',flush=True)
 page.evaluate("SHOOTING.start({seed:'boss-ui-qa',mode:'campaign',difficulty:'easy'})")
 page.evaluate('''()=>{const g=SHOOTING.game;g.enemies=[];g.boss=null;g.midSpawned=true;g.bossSpawned=false;g.stageTime=175;g.player.invincible=1e6;}''')
 page.wait_for_function('()=>!!SHOOTING.game.boss',timeout=30000)
 page.evaluate('''()=>{const g=SHOOTING.game;g.damageEnemy(g.boss,1e7);}''')
 page.wait_for_function("()=>SHOOTING.paused&&SHOOTING.game.phase==='stageclear'",timeout=30000)
 assert page.evaluate('SHOOTING.profile.stages.includes(1)');credits=page.evaluate('SHOOTING.profile.credits');page.wait_for_timeout(200);assert page.evaluate('SHOOTING.profile.credits')==credits
 page.screenshot(path=str(out/'result-390.png'));page.locator('[data-do=next]').click();assert page.evaluate('SHOOTING.game.stage')==1
 for width in [375,390,414]:
  page.set_viewport_size({'width':width,'height':812});page.evaluate('SHOOTING.resume()');page.wait_for_timeout(150)
  bounds=page.evaluate("()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#actions button')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};})})")
  assert not bounds['overflow'];assert all(x['w']>=44 and x['h']>=44 and x['bottom']<=812 for x in bounds['buttons']),bounds
  page.screenshot(path=str(out/f'play-{width}.png'))
 page.evaluate("SHOOTING.pause()");page.locator('[data-do=abandon]').click();page.evaluate("SHOOTING.navigate('achievements')");assert page.locator('.card').count()==100
 page.evaluate("SHOOTING.navigate('codex')");assert page.locator('.card').count()>=12
 page.locator('[data-do="codex:bosses"]').click();assert page.locator('.card').count()==7
 page.locator('[data-do="codex:materials"]').click();assert page.locator('.card').count()==5;assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.goto(base+'/');page.get_by_role('link',name='シューティングで遊ぶ ↗').wait_for(timeout=30000)
 assert not errors,errors
 page.close()
 denied=b.new_page();denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})");denied.goto(base+'/shooting/index.html');denied.wait_for_function('()=>!!window.SHOOTING',timeout=90000);assert denied.evaluate('SHOOTING.profile.storageError');denied.locator('[data-do=hangar]').first.click();denied.locator('[data-do=launch]').click();denied.wait_for_function('()=>SHOOTING.game?.tick>0',timeout=30000);denied.close()
 (out/'report.json').write_text(json.dumps(dict(workshop=True,developmentPersisted=True,keyboard=True,touchDrag=True,manualFire=True,focusToggle=True,pause=True,replayExact=True,replayRewards=False,controlledBossResult=True,nextStage=True,widths=[375,390,414],achievements=100,codex=True,homeLink=True,deniedStoragePlayable=True,errors=errors),indent=2))
 print('shooting browser integration passed',flush=True);b.close()
