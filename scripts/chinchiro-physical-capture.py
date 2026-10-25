"""Record normal UI-driven physical throws, without predetermined faces."""
import json,time,argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3481');ap.add_argument('--output',default='docs/qa/chinchiro-physics/video');args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='no-preference',record_video_dir=str(out/'raw'),record_video_size={'width':390,'height':844});page=c.new_page();page.goto(args.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro&&chinchiro.tray');page.click('#action');page.evaluate("document.querySelector('.physical-bowl').scrollIntoView({block:'start'})");page.click('#dice-zoom');page.evaluate("document.querySelector('#action').click()")
 page.evaluate('''()=>{window.frameSamples=[];let last=performance.now();function f(t){frameSamples.push(t-last);last=t;if(frameSamples.length<240)requestAnimationFrame(f);}requestAnimationFrame(f);}''')
 stop=time.monotonic()+12;seeds=set();saved=False
 while time.monotonic()<stop:
  state=page.evaluate('''()=>({busy:chinchiro.busy,seed:chinchiro.tray.world?.seed,phase:chinchiro.match.phase,result:chinchiro.tray.lastResult,paused:document.querySelector('#pause').textContent==='再開'})''')
  if state.get('seed') is not None:seeds.add(state['seed'])
  if state['busy'] and not saved:page.screenshot(path=str(out/'rolling.png'));saved=True
  if state['paused']:page.locator('#pause').evaluate('(b)=>b.click()')
  elif not state['busy'] and page.locator('#action').is_enabled():page.locator('#action').evaluate('(b)=>b.click()')
  page.wait_for_timeout(120)
 page.screenshot(path=str(out/'end.png'));frames=page.evaluate('frameSamples.slice(1)');video=page.video;c.close();video.save_as(str(out/'play.webm'));b.close()
 s=sorted(frames);report={'seeds':list(seeds),'fps':1000/(sum(frames)/len(frames)),'medianFrameMs':s[len(s)//2],'p95FrameMs':s[int(len(s)*.95)],'frameCount':len(frames),'limitations':'Chromium software GPU DPR1 with recording; not physical iPhone. Real UI throws, no face forcing, normal playback speed.'};(out/'capture.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
