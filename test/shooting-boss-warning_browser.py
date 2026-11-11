"""Captures the live boss-intro warning without hiding its overlay."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/formations-v1.4'))
out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000)
    page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>!!SHOOTING.game',timeout=30000)
    page.evaluate('''()=>{const g=SHOOTING.game;g.waveCD=1e9;g.enemies=[];g.player.invincible=1e9;const e=g.spawnEnemy(11,240,-70,true,false);e.hp=e.maxHp=1e9;window.__warningBoss=e;}''')
    page.wait_for_function("()=>SHOOTING.renderer.warning>0&&SHOOTING.renderer.warningBoss",timeout=10000)
    page.wait_for_timeout(180)
    page.screenshot(path=str(out/'boss-intro-warning-live-390.png'))
    page.locator('#canvas').screenshot(path=str(out/'boss-intro-warning-canvas-390.png'))
    mobile=[]
    for width in [375,390,414]:
        page.set_viewport_size({'width':width,'height':667})
        page.evaluate("SHOOTING.renderer.warning=3.2;SHOOTING.renderer.hudKey='';SHOOTING.renderer.render(SHOOTING.game,1)")
        page.wait_for_timeout(80)
        path=out/f'boss-intro-warning-{width}x667.png'
        page.screenshot(path=str(path))
        bounds=page.evaluate("()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#actions button')].map(b=>{const r=b.getBoundingClientRect();return{width:r.width,height:r.height,bottom:r.bottom}})})")
        assert not bounds['overflow'] and all(button['width']>=44 and button['height']>=44 and button['bottom']<=667 for button in bounds['buttons']),bounds
        mobile.append({'path':str(path),**bounds})
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('''()=>{SHOOTING.game.player.x=60;SHOOTING.game.player.y=270;SHOOTING.renderer.hudKey='';SHOOTING.renderer.render(SHOOTING.game,0)}''')
    page.wait_for_timeout(100)
    page.screenshot(path=str(out/'boss-warning-player-left-390.png'))
    page.evaluate('''()=>{SHOOTING.game.player.x=420;SHOOTING.game.player.y=270;SHOOTING.renderer.hudKey='';SHOOTING.renderer.render(SHOOTING.game,0)}''')
    page.wait_for_timeout(100)
    page.screenshot(path=str(out/'boss-warning-player-right-390.png'))
    state=page.evaluate('''()=>({warning:SHOOTING.renderer.warning,text:SHOOTING.renderer.warningText,boss:{x:__warningBoss.x,y:__warningBoss.y},player:{x:SHOOTING.game.player.x,y:SHOOTING.game.player.y},viewport:[innerWidth,innerHeight]})''')
    state['mobileViewports']=mobile;state['errors']=errors
    assert state['warning']>0 and state['text'] and not errors,state
    (out/'boss-warning-browser-report.json').write_text(json.dumps(state,indent=2))
    print(json.dumps(state));browser.close()
