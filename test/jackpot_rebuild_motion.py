"""Offline fixed-simulation-time observation clip; NOT a device FPS benchmark."""
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/jackpot-rebuild';NAME=os.environ.get('JACKPOT_CLIP','natural-motion');FRAMES=Path('/tmp/'+NAME+'-frames');FRAMES.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':620});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/rebuild-motion',lambda route:route.fulfill(content_type='text/html',body='<html><body style="margin:0;background:#071a16"><canvas id="board" style="width:390px;height:620px"></canvas><p id="caption" style="position:absolute;bottom:0;left:8px;color:#f0e8ce;font:12px sans-serif"></p></body></html>'))
 page.goto(os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3460')+'/rebuild-motion')
 page.evaluate('''async()=>{const {createSimulation}=await import('/js/abyss/engine.js');const {createRenderer}=await import('/js/abyss/renderer.js');window.g=createSimulation({seed:'abyss',initialBalls:100});window.r=createRenderer(document.querySelector('canvas'),g.board);window.nextFire=0;r.resize();}''')
 if os.environ.get('JACKPOT_WAIT_TRAY'):
  page.evaluate("""()=>{let steps=0;while(!g.balls.some(b=>b.zone==='tray')&&steps++<48000){if(g.remaining&&g.elapsed>=window.nextFire-1e-8){if(g.fire(35))window.nextFire=g.elapsed+.6;}g.step(1/240);}if(!g.balls.some(b=>b.zone==='tray'))throw Error('No natural tray arrival');}""")
 for frame in range(int(os.environ.get('JACKPOT_FRAMES','145'))):
  page.evaluate('''()=>{for(let i=0;i<20;i++){if(g.remaining&&g.elapsed>=window.nextFire-1e-8){if(g.fire(35))window.nextFire=g.elapsed+.6;}g.step(1/240);}r.render(g,{quality:'low',camera:'auto',delta:1/12});document.querySelector('#caption').textContent=`${g.elapsed.toFixed(1)}秒 / 発射${g.fired} / 段通過 ${g.passes.join('・')}`;}''')
  page.screenshot(path=str(FRAMES/f'{frame:04d}.jpg'),type='jpeg',quality=88,timeout=45000)
  if frame%24==0:print('frame',frame,flush=True)
 result=page.evaluate('''()=>({physics:g.physicsVersion,elapsed:g.elapsed,fired:g.fired,passes:g.passes,jackpots:g.jackpots,debugUsed:g.debugUsed,ledger:g.fired===g.lost+g.jackpots+g.balls.length})''');page.evaluate('r.dispose();g.dispose()');b.close()
assert not errors,errors
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','12','-i',str(FRAMES/'%04d.jpg'),'-frames:v',os.environ.get('JACKPOT_FRAMES','145'),'-c:v','libvpx-vp9','-crf','32','-b:v','0','-cpu-used','6','-pix_fmt','yuv420p',str(OUT/(NAME+'.webm'))],check=True)
(OUT/(NAME+'-report.json')).write_text(json.dumps({'note':'12fps offline observation rendered from actual fixed-step simulation. Not real-time cloud or iPhone performance. No debug drops or imposed outcomes.',**result,'errors':errors},ensure_ascii=False,indent=2));print(result)
