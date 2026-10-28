"""Controlled UI scenarios; not human difficulty or real iPhone tests."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('SHOOTING_QA_DIR','/tmp/shooting-ui-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000)
 page.screenshot(path=str(out/'after-menu.png'))
 page.evaluate("SHOOTING.start({seed:'ui-feedback',difficulty:'easy'})");page.wait_for_function('()=>SHOOTING.game?.tick>5')
 page.evaluate('''()=>{const g=SHOOTING.game;g.enemies=[];g.bullets.clear();g.waveCD=999;g.midSpawned=g.bossSpawned=true;g.player.invincible=999;g.player.hp=2;g.collect('H');}''')
 page.wait_for_function("()=>document.querySelector('#pickup-feed').textContent.includes('耐久 2 → 3')")
 assert page.locator('[role=meter]').get_attribute('aria-valuenow')=='3'
 page.evaluate("SHOOTING.game.collect('P')");page.wait_for_function("()=>document.querySelector('#pickup-feed').textContent.includes('威力 100 → 125%')")
 page.screenshot(path=str(out/'pickup-firepower-390.png'))
 page.evaluate("SHOOTING.game.player.hp=SHOOTING.game.player.maxHp;SHOOTING.game.collect('H')");page.wait_for_function("()=>document.querySelector('#pickup-feed').textContent.includes('全回復済み')")
 page.evaluate("SHOOTING.game.player.energy=0;SHOOTING.game.player.drive=100;SHOOTING.game.player.bombs=0;SHOOTING.game.player.specialCD=0")
 page.wait_for_function("()=>document.querySelector('[data-action=bomb]').disabled&&document.querySelector('[data-action=special]').disabled&&!document.querySelector('[data-action=overdrive]').disabled")
 assert 'EN 35必要' in page.locator('[data-action=special]').inner_text()
 page.locator('[data-action=overdrive]').tap();page.wait_for_function('()=>SHOOTING.game.player.driveTime>0')
 page.wait_for_function("()=>document.querySelector('[data-action=overdrive]').textContent.includes('発動中')")
 page.evaluate('''()=>{const g=SHOOTING.game;g.items=[];g.player.hp=1;g.player.energy=70;g.player.bombs=2;g.player.drive=64;g.player.driveTime=0;for(const [i,id]of ['P','H','E','W','B','X'].entries())g.drop(75+i%3*160,285+Math.floor(i/3)*95,id);}''')
 for width,height in [(375,812),(390,844),(414,896),(375,667)]:
  page.set_viewport_size({'width':width,'height':height});page.evaluate('SHOOTING.resume()');page.wait_for_function("()=>document.querySelector('#viewport').classList.contains('critical')")
  bounds=page.evaluate("()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#actions button')].map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height,bottom:r.bottom}})})")
  assert not bounds['overflow'];assert all(i['w']>=44 and i['h']>=44 and i['bottom']<=height for i in bounds['buttons']),bounds
  page.screenshot(path=str(out/f'after-play-{width}-{height}.png'))
 page.set_viewport_size({'width':390,'height':844});page.evaluate('SHOOTING.resume()');page.locator('#pause').click();page.locator('.item-guide summary').click()
 assert page.locator('.guide-grid>div').count()==19
 page.screenshot(path=str(out/'pause-guide-390.png'))
 page.locator('[data-do=resume]').click();page.wait_for_function('()=>!SHOOTING.paused')
 # All item cards are generated on GPU, including every symbol/Japanese label.
 page.evaluate('''()=>{const g=SHOOTING.game;g.items=[];for(const [i,id]of ['P','S','W','L','M','O','H','B','E','G','★','R','X','C','?','A','Q','T','D'].entries())g.drop(50+i%5*95,220+Math.floor(i/5)*90,id);}''')
 page.wait_for_function('()=>SHOOTING.renderer.itemTextures.size===19');page.screenshot(path=str(out/'all-items-390.png'))
 page.locator('[data-action=focus]').focus();page.keyboard.press('Enter');page.wait_for_function("()=>document.querySelector('[data-action=focus]').getAttribute('aria-pressed')==='true'")
 page.keyboard.press('Space');page.wait_for_function("()=>document.querySelector('[data-action=focus]').getAttribute('aria-pressed')==='false'")
 page.evaluate("()=>{const g=SHOOTING.game;g.items=[];g.collect('A');g.collect('Q');g.collect('T');g.collect('D');g.player.cooldown=0;}")
 page.wait_for_function('()=>SHOOTING.renderer.orbitSprites.filter(s=>s.visible).length===2');page.wait_for_function('()=>SHOOTING.renderer.shield.visible');page.screenshot(path=str(out/'visual-upgrades-390.png'))
 # Reduced-motion preference and existing save remain operable.
 page.evaluate('SHOOTING.profile.settings.reduced=true;SHOOTING.renderer.setReduced(true)')
 page.evaluate('SHOOTING.game.player.shield=0;SHOOTING.game.player.invincible=0;SHOOTING.game.player.hp=3;SHOOTING.game.hurt()')
 page.wait_for_function("()=>document.querySelector('#viewport').classList.contains('damaged')")
 page.screenshot(path=str(out/'damage-390.png'))
 assert not errors,errors
 (out/'feedback-report.json').write_text(json.dumps({'actualPickupDelta':True,'cappedRecovery':True,'hpMeter':True,'criticalState':True,'abilityReadiness':True,'overdriveActivated':True,'guideCount':19,'widths':[375,390,414],'smallHeight667':True,'allItemTextures':19,'reducedMotion':True,'errors':errors},indent=2))
 print('feedback UI browser tests passed',flush=True);b.close()
