"""User-level sound/pause/focus regression. Chromium emulation, not real iPhone."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
out=Path(os.environ.get('SHOOTING_QA_DIR','/tmp/shooting-ux-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING')
 page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>SHOOTING.game?.tick>3')
 page.locator('#sound').click();page.wait_for_selector('.pause-audio[open]')
 assert page.evaluate('()=>SHOOTING.paused')
 assert page.locator('#overlay').get_attribute('role')=='dialog'
 assert page.evaluate("document.activeElement.id")=='pause-setting-bgm'
 tick=page.evaluate('SHOOTING.game.tick')
 page.locator('#pause-setting-bgm').fill('0.1');page.locator('#pause-setting-se').fill('0.2')
 assert page.evaluate('SHOOTING.profile.settings.bgm')==.1
 assert page.locator('output[for=pause-setting-bgm]').inner_text()=='10%'
 assert page.evaluate('SHOOTING.game.tick')==tick
 # All pause controls stay keyboard reachable; focus never falls behind the overlay.
 for i in range(12):
  page.keyboard.press('Tab');assert page.evaluate('()=>document.querySelector("#overlay").contains(document.activeElement)')
 page.locator('#pause-setting-se').focus();page.keyboard.press('Escape')
 assert not page.evaluate('SHOOTING.paused')
 assert page.evaluate('document.activeElement.id')=='sound'
 page.locator('#pause').click();assert page.evaluate('document.activeElement.dataset.do')=='resume'
 page.locator('[data-do=resume]').click();page.wait_for_function('()=>!SHOOTING.paused')
 for width,height in [(375,667),(375,812),(390,844),(414,896),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height});page.locator('#sound').click()
  page.screenshot(path=str(out/f'after-audio-{width}-{height}.png'))
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  for control in ['#pause-setting-bgm','#pause-setting-se','[data-do=resume]']:
   page.locator(control).scroll_into_view_if_needed();assert page.locator(control).is_visible()
  page.locator('[data-do=resume]').click()
 # Staged result setup skips boss wait; visible Next and the transition use real UI.
 page.evaluate('()=>{const g=SHOOTING.game;g.completeStage();}');page.wait_for_selector('[data-do=next]');page.wait_for_timeout(1700)
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'after-stage-clear-390.png'))
 assert page.evaluate('()=>document.querySelector("#overlay").contains(document.activeElement)')
 page.locator('#sound').click();assert page.locator('.pause-audio').get_attribute('open') is not None
 page.locator('[data-do=next]').click();page.wait_for_function('()=>SHOOTING.game.stage===1');assert not page.evaluate('SHOOTING.paused');assert page.evaluate('document.activeElement.id')=='canvas'
 page.locator('#pause').click();page.locator('[data-do=abandon]').click();page.wait_for_selector('[data-do=launch]');page.locator('[data-do=title]').focus();page.keyboard.press('Tab');assert page.evaluate('()=>document.querySelector("#menu").contains(document.activeElement)')
 page.reload();page.wait_for_function('()=>!!window.SHOOTING')
 assert page.evaluate('SHOOTING.profile.settings.bgm')==.1
 assert page.evaluate('SHOOTING.profile.settings.se')==.2
 assert not errors,errors
 print(json.dumps({'widths':[375,390,414,1440],'shortHeight':667,'pausePreservesTicks':True,'audioSaved':True,'keyboardFocusContained':True,'escapeFromSlider':True,'nextStage':True,'errors':errors}))
 b.close()
