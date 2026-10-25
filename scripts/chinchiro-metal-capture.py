"""Capture the rendered canvas and actual Web Audio on one MediaRecorder clock."""
import argparse,base64,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3482');ap.add_argument('--output',default='docs/qa/chinchiro-metal/video');args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(args.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro?.tray');page.click('#sound');page.wait_for_function('()=>chinchiro.tray.sound.enabled');page.click('#action');page.click('#dice-zoom');page.evaluate("document.querySelector('.physical-bowl').scrollIntoView({block:'start'})")
 page.evaluate('''()=>{
  const tray=chinchiro.tray,sound=tray.sound,dest=sound.context.createMediaStreamDestination();sound.output.connect(dest);
  const video=tray.canvas.captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?'video/webm;codecs=vp8,opus':'video/webm';const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000});
  window.capture={recorder,chunks:[],dest,stream};recorder.ondataavailable=e=>{if(e.data.size)capture.chunks.push(e.data);};recorder.start(100);
  const samples=[];let last=performance.now(),wasActive=false;window.metalFrames=samples;function f(t){const active=chinchiro.tray.world&&!chinchiro.tray.world.done&&!chinchiro.tray.paused;if(active&&wasActive)samples.push(t-last);last=t;wasActive=active;requestAnimationFrame(f);}requestAnimationFrame(f);
 }''')
 start=time.monotonic();seeds=[];saved=False
 while time.monotonic()-start<10:
  state=page.evaluate('''()=>({busy:chinchiro.busy,phase:chinchiro.match.phase,seed:chinchiro.tray.world?.seed,paused:document.querySelector('#pause').textContent==='再開'})''')
  if state.get('seed') is not None and state['seed'] not in seeds:seeds.append(state['seed'])
  if state['busy'] and not saved:page.screenshot(path=str(out/'rolling.png'));saved=True
  if state['paused']:page.locator('#pause').evaluate('(b)=>b.click()')
  elif page.locator('#action').is_enabled():page.locator('#action').evaluate('(b)=>b.click()')
  page.wait_for_timeout(100)
 page.screenshot(path=str(out/'screen.png'),full_page=True)
 encoded=page.evaluate('''()=>new Promise(resolve=>{capture.recorder.onstop=async()=>{const blob=new Blob(capture.chunks,{type:capture.recorder.mimeType});const r=new FileReader();r.onload=()=>resolve(r.result.slice(r.result.indexOf(';base64,')+8));r.readAsDataURL(blob);capture.stream.getTracks().forEach(t=>t.stop());chinchiro.tray.sound.output.disconnect(capture.dest);};capture.recorder.stop();})''')
 (out/'play.webm').write_bytes(base64.b64decode(encoded));report=page.evaluate('''()=>({audio:chinchiro.tray.sound.stats,frames:metalFrames.slice(1),voices:chinchiro.tray.sound.voices.size})''');frames=sorted(report.pop('frames'));report.update({'seeds':seeds,'pageErrors':errors,'fps':len(frames)*1000/sum(frames),'medianFrameMs':frames[len(frames)//2],'p95FrameMs':frames[int(len(frames)*.95)],'method':'Real UI throws, canvas.captureStream plus actual Web Audio output on the same MediaRecorder clock; no microphone, no replaced audio, no speed changes. Active-throw RAF timings, Chromium software GPU DPR1.'});(out/'capture.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));browser.close()
