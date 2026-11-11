from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/formations-v1.4/combat'))
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':390,'height':844},record_video_dir=str(out),record_video_size={'width':780,'height':1688})
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000)
    page.evaluate('''()=>{SHOOTING.profile.settings.autofire=false;SHOOTING.start({seed:'formation-motion-review',mode:'campaign',difficulty:'easy',stage:0});const g=SHOOTING.game;g.player.x=240;g.player.y=680;g.player.invincible=1e9;g.waveCD=1e9;g.midSpawned=true;g.bossSpawned=true;}''')
    rows=[]
    for formation in range(1,5):
        page.evaluate(f'''async()=>{{const {{wavePositions}}=await import('/shooting/core.js');const g=SHOOTING.game;g.enemies=[];g.items=[];g.bullets.clear();g.stageTime=0;g.wave={formation};for(const [i,p] of wavePositions(5,{formation},0).entries())g.spawnEnemy((i+{formation})%12,p.x,p.y,false);}}''')
        page.wait_for_timeout(3200)
        path=out/f'formation-{formation}-after-3s.png'
        page.screenshot(path=str(path))
        rows.append({'formation':formation,'image':str(path),'enemies':page.evaluate('SHOOTING.game.enemies.length'),'activeBullets':page.evaluate('SHOOTING.game.bullets.count')})
    assert all(row['enemies']>0 and row['activeBullets']>0 for row in rows),rows
    assert not errors,errors
    (out/'report.json').write_text(json.dumps({'viewport':[390,844],'pilot':'stationary, invulnerable, no player fire; fixed seeded live enemy simulation','frames':rows,'errors':errors},indent=2))
    video=page.video
    page.close();context.close()
    print(json.dumps({'video':str(video.path()),'frames':rows,'errors':errors}))
    browser.close()
