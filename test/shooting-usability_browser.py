import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('SHOOTING_QA_DIR','/tmp/shooting-usability'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 blocked=b.new_page(viewport={'width':390,'height':844});blocked.add_init_script("""window.blockGraphics=true;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(window.blockGraphics&&String(type).includes('webgl'))return null;return get.call(this,type,...args)}""")
 blocked.goto(base+'/shooting/index.html');blocked.wait_for_function('()=>!!window.SHOOTING',timeout=90000);assert blocked.locator('[data-do=quickstart]').is_disabled();blocked.locator('[data-do=hangar]').first.click()
 assert blocked.locator('[data-do=launch]').is_disabled(),'launch must be disabled when WebGL creation fails'
 assert blocked.locator('#graphics-notice [role=alert]').count()==1
 blocked.locator('#graphics-notice summary').click();assert 'Safari' in blocked.locator('#graphics-notice').inner_text()
 blocked.screenshot(path=str(out/'graphics-failed-390.png'))
 blocked.locator('[data-do=retry-graphics]').click();blocked.wait_for_function("()=>!document.querySelector('[data-do=retry-graphics]').disabled")
 assert blocked.locator('[data-do=launch]').is_disabled();assert blocked.locator('#graphics-notice [role=alert]').count()==1
 blocked.evaluate('window.blockGraphics=false');blocked.locator('[data-do=retry-graphics]').click();blocked.wait_for_function("()=>!document.querySelector('[data-do=launch]').disabled",timeout=90000)
 assert not blocked.locator('#graphics-notice').inner_text().strip();blocked.locator('[data-do=launch]').click();blocked.wait_for_function('()=>SHOOTING.game?.tick>5')
 # A real context-loss extension exercises mid-run recovery and prevents premature resume.
 blocked.evaluate("SHOOTING.renderer.renderer.getContext().getExtension('WEBGL_lose_context').loseContext()")
 blocked.wait_for_function('()=>SHOOTING.paused');blocked.evaluate('window.lostTick=SHOOTING.game.tick;SHOOTING.resume()');assert blocked.evaluate('SHOOTING.paused')
 blocked.locator('[data-do=retry-graphics]').first.click();blocked.wait_for_function("()=>document.querySelector('[data-do=resume]')&&!document.querySelector('[data-do=resume]').disabled",timeout=90000)
 blocked.locator('[data-do=resume]').click();blocked.wait_for_function('()=>SHOOTING.game.tick>window.lostTick+3')
 blocked.evaluate('()=>{const g=SHOOTING.game;g.damageEnemy(g.spawnEnemy(11,240,135,true,false),1e8);}');blocked.wait_for_function("()=>!!document.querySelector('[data-do=next]')")
 blocked.evaluate("window.creditsBeforeLoss=SHOOTING.profile.credits;SHOOTING.renderer.renderer.getContext().getExtension('WEBGL_lose_context').loseContext()")
 blocked.locator('#graphics-notice [role=alert]').wait_for();blocked.locator('[data-do=retry-graphics]').first.click();blocked.wait_for_function("()=>!!document.querySelector('[data-do=next]')",timeout=5000)
 assert blocked.evaluate('SHOOTING.profile.credits===window.creditsBeforeLoss');blocked.close()
 page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000)
 assert page.locator('.quick-controls>div').count()==3
 page.evaluate('SHOOTING.profile.settings.autofire=false');page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>SHOOTING.game?.tick>30')
 assert page.evaluate("SHOOTING.game.options.ship===0&&SHOOTING.game.options.weapon===0&&SHOOTING.game.options.support===0&&SHOOTING.game.options.difficulty==='easy'&&SHOOTING.game.options.mode==='campaign'")
 assert page.evaluate('SHOOTING.game.stats.shots')>0;assert page.evaluate('SHOOTING.profile.settings.autofire')==False
 page.evaluate('SHOOTING.pause()');page.locator('[data-do=abandon]').click()
 assert page.locator('.loadout-summary').count()==1
 images=page.locator('.ship-preview');assert images.count()==8
 sources=images.evaluate_all('(imgs)=>imgs.map(i=>i.src)');assert len(set(sources))==8
 assert page.locator('.ship-stats [role=meter]').count()==24
 assert '初心者向け' in page.locator('.card').first.inner_text()
 for mode,expected in [('score','固定装備'),('daily','日替わり'),('bossrush','ボス'),('campaign','5')]:
  page.locator('#mode').select_option(mode);assert expected in page.locator('#mode-description').inner_text()
  assert page.locator('#difficulty').is_disabled()==(mode in ['score','daily'])
  if mode in ['score','daily']:assert '翠燕' in page.locator('.loadout-summary').inner_text()
 page.locator('#difficulty').select_option('hard');assert page.locator('#difficulty option:checked').inner_text()=='激戦（HARD）'
 page.locator('[data-do="equip:ship:1"]').click();assert '白鷺' in page.locator('.loadout-summary').inner_text()
 for width in [375,390,414]:
  page.set_viewport_size({'width':width,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'hangar-{width}.png'),full_page=True)
 page.evaluate("SHOOTING.navigate('help')");assert page.locator('.quick-controls>div').count()==3;assert not page.locator('.balance').count();assert page.locator('.manual-detail[open]').count()==0
 page.screenshot(path=str(out/'help-414.png'),full_page=True)
 page.evaluate("SHOOTING.navigate('settings')");assert not page.locator('.balance').count()
 assert page.locator('output[for=setting-bgm]').inner_text()=='25%';assert page.locator('output[for=setting-sensitivity]').inner_text()=='1.0倍';assert page.locator('output[for=setting-offset]').inner_text()=='60px'
 page.locator('#setting-offset').fill('90');page.locator('#setting-sensitivity').fill('1.5');assert page.locator('output[for=setting-offset]').inner_text()=='90px';assert page.locator('output[for=setting-sensitivity]').inner_text()=='1.5倍'
 gap=page.evaluate("()=>{const a=document.querySelector('.preview-ship').getBoundingClientRect(),b=document.querySelector('.preview-finger').getBoundingClientRect();return(b.y+b.height/2)-(a.y+a.height/2)}")
 assert abs(gap-90)<1,gap
 page.screenshot(path=str(out/'settings-414.png'),full_page=True);page.reload();page.wait_for_function('()=>!!window.SHOOTING',timeout=90000);assert page.evaluate('SHOOTING.profile.settings.offset')==90
 for screen in ['title','hangar','help','settings']:
  page.evaluate(f"SHOOTING.navigate('{screen}')")
  for width in [375,390,414]:
   page.set_viewport_size({'width':width,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(screen,width)
   page.screenshot(path=str(out/f'{screen}-viewport-{width}.png'))
 assert not errors,errors
 (out/'report.json').write_text(json.dumps({'webglFailureDisablesLaunch':True,'retryFailureNoDuplicate':True,'retryRecovery':True,'contextLossRecovery':True,'resultRecoveryWithoutDuplicateRewards':True,'quickstartAutoWithoutPreferenceMutation':True,'uniqueShipPreviews':8,'performanceMeters':24,'modeDescriptions':True,'difficultyNaming':True,'settingsUnits':True,'touchOffsetPreviewPixels':gap,'settingsPersisted':True,'widths':[375,390,414],'screens':['title','hangar','help','settings'],'errors':errors},indent=2));print('usability browser tests passed',flush=True);b.close()
