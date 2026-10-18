from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('docs/qa/mobile-stability');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=3);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=quality');page.wait_for_selector('iframe');c=page.frames[1];c.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000)
 result=c.evaluate('''()=>{const g=SILVER_GAME,r=g.refs,v=new r.THREE.Vector2();r.renderer.getDrawingBufferSize(v);return{quality:r.quality(),locked:g.S.qualityLocked,pixelRatio:r.renderer.getPixelRatio(),deviceRatio:devicePixelRatio,buffer:v.toArray(),viewport:[innerWidth,innerHeight],samples:r.composer.renderTarget1.samples,anisotropy:r.boardTex.anisotropy}}''')
 assert result['quality']==2 and result['locked'] and result['pixelRatio']==2,result
 assert result['buffer'][0]==result['viewport'][0]*2,result
 assert result['anisotropy']==16 and result['samples']==0,result
 page.get_by_role('button',name='設定',exact=True).click();assert page.get_by_label('描画品質').input_value()=='high'
 page.get_by_label('描画品質').select_option('low');c.wait_for_function('()=>SILVER_GAME.refs.quality()===0');assert c.evaluate('SILVER_GAME.refs.renderer.getPixelRatio()')==1
 page.get_by_label('描画品質').select_option('high');c.wait_for_function('()=>SILVER_GAME.refs.quality()===2');assert c.evaluate('SILVER_GAME.refs.renderer.getPixelRatio()')==2
 assert not errors,errors
 (OUT/'report.json').write_text(json.dumps({**result,'manualSwitch':True,'errors':errors},indent=2));print(result);b.close()
