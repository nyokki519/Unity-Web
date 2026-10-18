from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('docs/qa/stage-sounds')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=stage-sounds');f=page.frame_locator('iframe');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000);c=page.frames[1]
 c.wait_for_function("()=>window.SILVER_GAME?.audio.samples.status==='ready'",timeout=90000)
 result=c.evaluate('''()=>{const g=SILVER_GAME,a=g.audio;a.setMute(false);for(let tier=0;tier<3;tier++)g.sim.emit('sink',{tier,win:true,x:0,y:1,z:0});g.sim.emit('jackpot',{});return{played:a.samples.playCount,durations:Object.fromEntries(Object.entries(a.samples.buffers).map(([k,v])=>[k,v.duration])),thirdActive:a.samples.active.jackpot.size}}''')
 assert result['played']=={'breakthrough2':1,'breakthrough':1,'jackpot':1},result
 assert abs(result['durations']['breakthrough']-1.6)<.02 and abs(result['durations']['breakthrough2']-3.13)<.05 and abs(result['durations']['jackpot']-11.44)<.05,result
 assert result['thirdActive']==1;assert not errors,errors
 (OUT/'browser.json').write_text(json.dumps({**result,'errors':errors,'method':'Controlled real sink callbacks followed by jackpot event; not natural breakthrough odds.'},indent=2));print(result);b.close()
