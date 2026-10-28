"""Controlled all-pickup battle using real collect(), not a human difficulty score."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');out=Path(os.environ.get('SHOOTING_BALANCE_QA','/tmp/shooting-fullbuild-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 if os.environ.get('PROXY_SPKI'):args+=['--ignore-certificate-errors-spki-list='+os.environ['PROXY_SPKI']]
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=args);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000);page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>SHOOTING.game?.stats.shots>0');saved=page.evaluate("localStorage.getItem('unity-shooting-profile-v1')")
 data=page.evaluate('''async()=>{const {GAME_VERSION,powerScale,rapidScale}=await import('/shooting/balance.js');const g=SHOOTING.game;g.player.invincible=10000;const before=g.spawnEnemy(8,420,100).maxHp;for(const[id,n]of [['P',7],['S',5],['W',3],['L',3],['M',3],['O',2],['A',3],['Q',3],['T',3],['X',1]])for(let i=0;i<n;i++)g.collect(id);const after=g.spawnEnemy(8,420,100).maxHp;return{version:GAME_VERSION,power:powerScale(g.player.level),rapid:rapidScale(g.player.rapid),level:g.player.level,rapidLevel:g.player.rapid,width:g.player.width,options:g.player.options,weapon:g.player.weapon,fused:g.player.fused,beforeHp:before,afterHp:after}}''')
 assert data['version']=='1.3.0';assert abs(data['power']-1.43)<1e-8;assert abs(data['rapid']-1.36)<1e-8;assert data['weapon']==19 and data['fused'];assert data['beforeHp']==data['afterHp'];page.wait_for_timeout(400);assert page.evaluate("localStorage.getItem('unity-shooting-profile-v1')")==saved
 for width in [375,390,414]:
  page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(120);assert not page.evaluate('()=>document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'all-upgrades-{width}.png'))
 assert not errors,errors;(out/'report.json').write_text(json.dumps({'fixture':'Controlled all-pickup battle; not human clear-rate','observed':data,'progressSaveNotOverwritten':True,'widths':[375,390,414],'errors':errors},indent=2));b.close();print('shooting actual all-pickup browser passed')
