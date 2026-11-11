"""Captures four deterministic wave silhouettes in the live Three.js canvas."""
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
    page.evaluate("SHOOTING.game.player.invincible=1e9;SHOOTING.pause();document.querySelector('#overlay').hidden=true")
    results=[]
    for formation in range(1,5):
        page.evaluate(f'''async()=>{{const {{wavePositions}}=await import('/shooting/core.js');const g=SHOOTING.game;g.stage=0;g.enemies=[];g.bullets.clear();const positions=wavePositions(5,{formation},0);positions.forEach((p,i)=>{{const e=g.spawnEnemy((i+{formation})%12,p.x,p.y+300,false);e.x=p.x;e.y=p.y+300;e.age=0;}});SHOOTING.renderer.warning=0;SHOOTING.renderer.render(g,1);}}''')
        page.wait_for_timeout(80)
        path=out/f'wave-formation-{formation}-390.png'
        page.locator('#canvas').screenshot(path=str(path))
        results.append(str(path))
    report={'viewport':[390,844],'formationScreenshots':results,'errors':errors}
    assert not errors,errors
    (out/'formation-browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report));browser.close()
