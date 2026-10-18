from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});page.goto('http://127.0.0.1:3461/?bonus=jackpot');page.wait_for_selector('iframe');c=page.frames[1];c.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000)
 c.evaluate('SILVER_GAME.refs.setQuality(0)');c.wait_for_timeout(300)
 c.evaluate("()=>{const cv=document.getElementById('game'),d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');window.canvasClears=0;Object.defineProperty(cv,'width',{get(){return d.get.call(this)},set(v){canvasClears++;d.set.call(this,v)},configurable:true});for(let i=0;i<5;i++)visualViewport.dispatchEvent(new Event('resize'))}")
 c.wait_for_timeout(300);assert c.evaluate('window.canvasClears')==0,'Unchanged viewport must not clear the drawing buffer'
 page.frame_locator('iframe').get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000)
 for i in range(3):
  c.evaluate('()=>{for(let step=0;step<240;step++)SILVER_GAME.sim.step(1/240)}');page.frame_locator('iframe').locator('#singleShot').click();c.evaluate("visualViewport.dispatchEvent(new Event('resize'))")
 c.wait_for_timeout(300);assert c.evaluate('window.canvasClears')==0;assert c.evaluate('SILVER_GAME.S.fired')==3
 page.set_viewport_size({'width':414,'height':844});c.wait_for_function("()=>document.getElementById('game').width===innerWidth*SILVER_GAME.refs.renderer.getPixelRatio()&&innerWidth===414",timeout=30000)
 out=Path('docs/qa/resize-flash');out.mkdir(parents=True,exist_ok=True);(out/'resize.json').write_text(json.dumps({'redundantResizeCanvasClears':0,'singleShots':3,'actualResizeUpdatesBuffer':True},indent=2))
 print('redundant resize and single shots do not clear canvas; real resize works');b.close()
