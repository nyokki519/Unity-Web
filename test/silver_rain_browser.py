from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
from statistics import median
OUT=Path('docs/qa/resume-rain');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=rain');f=page.frame_locator('iframe');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000);child=page.frames[1]
 assert child.evaluate('SILVER_GAME.refs.renderer.getContext().getContextAttributes().alpha') is True
 assert child.evaluate('SILVER_GAME.refs.scene.background===null') is True
 child.wait_for_function("()=>document.querySelectorAll('.unity-note').length===14")
 def positions():return child.evaluate("()=>['left','right'].map(side=>[...document.querySelectorAll('.unity-note[data-side='+side+']')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}))")
 a=positions();child.wait_for_timeout(1200);c=positions();moves=[median(abs(x['y']-y['y']) for x,y in zip(a[i],c[i]) if abs(x['y']-y['y'])<325) for i in range(2)];assert all(m>20 for m in moves),moves
 visible=[sum(r['y']<650 and r['y']+r['h']>0 and r['x']<390 and r['x']+r['w']>0 for r in side) for side in c];assert all(n>=3 for n in visible),visible
 page.screenshot(path=str(OUT/'left-right-rain.png'),timeout=60000)
 page.get_by_role('button',name='一時停止',exact=True).click();child.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");times=child.evaluate("()=>[...document.querySelectorAll('.unity-note')].map(n=>n.getAnimations()[0].currentTime)");child.wait_for_timeout(400);after=child.evaluate("()=>[...document.querySelectorAll('.unity-note')].map(n=>n.getAnimations()[0].currentTime)");assert all(abs(x-y)<20 for x,y in zip(times,after))
 page.get_by_role('button',name='設定',exact=True).click();page.get_by_label('金貨の背景演出',exact=True).uncheck();child.wait_for_function('()=>SILVER_GAME.refs.banknoteRain.layer.hidden');page.get_by_label('金貨の背景演出',exact=True).check();child.wait_for_function('()=>!SILVER_GAME.refs.banknoteRain.layer.hidden');page.get_by_label('動きを減らす',exact=True).check();child.wait_for_function('()=>!SILVER_GAME.refs.banknoteRain.layer.hidden');page.get_by_role('button',name='設定',exact=True).click();page.get_by_role('button',name='再開する',exact=True).click();child.wait_for_function("()=>SILVER_GAME.S.phase==='play'")
 assert not errors,errors;(OUT/'rain.json').write_text(json.dumps({'bothSidesVisible':visible,'movementPixelsIn1_2s':moves,'pausedStopsAnimation':True,'toggleAndReduced':True,'errors':errors},indent=2));print('rain passed',flush=True);b.close()
