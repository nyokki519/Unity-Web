from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('docs/qa/visible-rain-zawa');rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width in [390]:
  page=b.new_page(viewport={'width':width,'height':844},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=reduced-200')
  f=page.frame_locator('iframe');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000);c=page.frames[1]
  c.wait_for_function("()=>SILVER_GAME.refs.boardTex.userData.artwork==='ready'&&SILVER_GAME.refs.banknoteRain.layer.dataset.icon==='ready'",timeout=60000)
  assert c.evaluate('SILVER_GAME.S.reduce')
  balance=c.evaluate('SILVER_GAME.S.funds');f.locator('#singleShot').click();assert c.evaluate('SILVER_GAME.S.funds')==balance-200
  page.get_by_role('button',name='設定',exact=True).click();page.get_by_role('button',name='背景の落下を確認',exact=True).click()
  c.evaluate("()=>{const g=SILVER_GAME;g.fx.setCamMode('WIDE');for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false});g.refs.maskBackground();g.refs.composer.render()}")
  before=c.evaluate("()=>[...document.querySelectorAll('.unity-note')].map(n=>n.getBoundingClientRect().y)")
  c.wait_for_timeout(1200)
  result=c.evaluate("()=>{const n=document.querySelector('.unity-note'),s=getComputedStyle(n);return{hidden:SILVER_GAME.refs.banknoteRain.layer.hidden,animation:s.animationName,duration:s.animationDuration,positions:[...document.querySelectorAll('.unity-note')].map(n=>n.getBoundingClientRect().y)}}")
  assert not result['hidden'] and result['animation']=='unity-note-calm' and result['duration']=='36s',result
  assert sum(abs(a-z)>10 for a,z in zip(before,result['positions']))>=10,result
  page.screenshot(path=str(OUT/f'reduced-200-{width}.png'),timeout=60000)
  assert not errors,errors;rows.append({'width':width,'initial':balance,'shotCost':200,'reducedMotionStillFalls':True,'errors':errors});page.close()
 b.close()
(OUT/'reduced-economy.json').write_text(json.dumps(rows,indent=2));print(rows)
