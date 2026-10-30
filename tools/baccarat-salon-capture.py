"""Actual pointer-operated demo; fixed legal QA shoe, no mocked rendering or audio."""
import os,json,base64,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('UNITY_URL','http://127.0.0.1:3483');OUT=Path(os.environ.get('SALON_CAPTURE','/workspace/scratch/salon-capture'));OUT.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/baccarat/index.html');page.wait_for_function('()=>window.SALON?.ready');page.wait_for_timeout(300)
 def snap(name,full=True):page.screenshot(path=str(OUT/(name+'.png')),full_page=full)
 snap('title-390');page.locator('[data-action=start]').click();snap('table-390');page.locator('[data-action="chip:100"]').click();page.locator('[data-action="bet:banker"]').click();snap('bet-390')
 page.evaluate('''()=>{SALON.settings.squeeze='all';SALON.settings.reduced=false;const s=SALON.controller.session.state,k=s.shoe.cursor,prefix=s.shoe.order.slice(0,k),used=new Set(prefix);const cards=[12,3,11,4].map(face=>{const id=s.shoe.order.slice(k).find(id=>id%52===face&&!used.has(id));used.add(id);return id});s.shoe.order=[...prefix,...cards,...s.shoe.order.slice(k).filter(id=>!cards.includes(id))];}''')
 cdp=page.context.new_cdp_session(page);frames=OUT/'frames';frames.mkdir(exist_ok=True);stamps=[]
 def frame(e):
  (frames/f'{len(stamps):05d}.jpg').write_bytes(base64.b64decode(e['data']));stamps.append(e['metadata']['timestamp']);cdp.send('Page.screencastFrameAck',{'sessionId':e['sessionId']})
 cdp.on('Page.screencastFrame',frame);cdp.send('Page.startScreencast',{'format':'jpeg','quality':87,'everyNthFrame':1})
 epoch=page.evaluate('''()=>{const ctx=SALON.audio.ctx;window.captureMix=ctx.createMediaStreamDestination();Object.values(SALON.audio.gains).forEach(g=>g.connect(captureMix));window.captureChunks=[];window.captureRecorder=new MediaRecorder(captureMix.stream);captureRecorder.ondataavailable=e=>captureChunks.push(e.data);captureRecorder.start();return Date.now()/1000}''')
 page.locator('[data-action=confirm]').click();expect(page.locator('[data-squeeze=finish]')).to_be_visible(timeout=10000);page.wait_for_selector('.salon-squeeze__canvas',timeout=10000);page.wait_for_timeout(180)
 stage=page.locator('.salon-squeeze__stage');box=stage.bounding_box();right=os.environ.get('SALON_EDGE')=='right';card=page.evaluate('()=>SALON.squeeze.getCardRect().toJSON()') if right else None;x=card['right']-card['width']*.05 if right else box['x']+box['width']*.72;y=card['y']+card['height']*.5 if right else box['y']+box['height']*.82;page.mouse.move(x,y);page.mouse.down()
 for i in range(1,15):page.mouse.move(x-(card['width']*.5 if right else 25)*i/14,y if right else y-box['height']*.38*i/14,steps=2);page.wait_for_timeout(35)
 page.mouse.up();page.wait_for_timeout(300);snap('squeeze-390',False);page.wait_for_timeout(500);page.locator('[data-squeeze=finish]').click()
 for i in range(3):
  expect(page.locator('[data-squeeze=finish]')).to_be_visible(timeout=10000);page.wait_for_timeout(330);page.locator('[data-squeeze=finish]').click()
 expect(page.locator('#salon-receipt')).to_be_visible(timeout=10000);page.wait_for_timeout(800);page.locator('#salon-receipt').scroll_into_view_if_needed();snap('result-390');page.wait_for_timeout(1600);cdp.send('Page.stopScreencast')
 report=page.evaluate('''async()=>{await new Promise(r=>{captureRecorder.onstop=r;captureRecorder.stop()});let bytes=new Uint8Array(await new Blob(captureChunks).arrayBuffer()),s='';for(const x of bytes)s+=String.fromCharCode(x);return{audio:btoa(s),receipt:SALON.controller.session.state.round.receipt,plan:SALON.controller.session.state.round.plan}}''');(OUT/'audio.webm').write_bytes(base64.b64decode(report.pop('audio')));report.update(epoch=epoch,screenTimes=stamps,errors=errors,fixture='Legal known-shoe QA hand, actual gestures and WebAudio, not a prediction or normal-game forced outcome');(OUT/'capture.json').write_text(json.dumps(report,indent=2));assert not errors,errors;b.close()
lines=[]
for i,t in enumerate(stamps):lines.extend([f"file '{frames/f'{i:05d}.jpg'}'",'duration '+str(max(.001,stamps[i+1]-t) if i+1<len(stamps) else .1)])
(OUT/'frames.txt').write_text('\n'.join(lines));offset=epoch-stamps[0];af=f'adelay={max(0,round(offset*1000))}:all=1' if offset>=0 else f'atrim=start={-offset},asetpts=PTS-STARTPTS'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(OUT/'frames.txt'),'-i',str(OUT/'audio.webm'),'-filter:a',af,'-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-r','30','-c:a','aac','-shortest',str(OUT/'round-with-audio.mp4')],check=True)
print('Actual demo recorded',report['receipt'])
