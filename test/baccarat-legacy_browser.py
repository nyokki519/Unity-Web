import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_QA_DIR','/tmp/baccarat-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));checks=[]
 page.goto(base+'/');page.get_by_role('link',name='バカラで遊ぶ ↗').wait_for();page.get_by_role('button',name='ルームをつくる ↗').click();page.locator('input[name=name]').wait_for();assert page.locator('select[name=eventGame] option').count()>=7;checks.append('Unity MIX create form and event modes')
 page.goto(base+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>!!window.chinchiro',timeout=90000);assert page.locator('.player').count()==2;page.locator('#action').click();page.wait_for_function('()=>!chinchiro.busy',timeout=60000);assert sum(int(x.replace(',','').split()[0]) for x in page.locator('.bank').all_inner_texts())==2000;checks.append('Chinchiro roll and coin conservation')
 page.goto(base+'/silver-ring/index.html');page.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000);page.locator('#btnStart').click();n=page.evaluate('SILVER_GAME.S.fired');page.locator('#singleShot').click();assert page.evaluate('SILVER_GAME.S.fired')==n+1;assert page.evaluate('SILVER_GAME.S.funds')==49800;checks.append('Retro shot and 200-credit debit')
 page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000);page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>SHOOTING.game?.stats.shots>0',timeout=30000);checks.append('Shooting quickstart and actual firing')
 assert page.goto(base+'/mechanical/index.html').status==410;checks.append('Retired mechanical remains410');assert not errors,errors
 (out/'legacy.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(json.dumps(checks));b.close()
