"""Fresh same-state source crops against actual local UI, using an isolated legal shoe.
Reference captured by normal guest play. Local fixtures change only isolated browser state.
"""
import json,os,time,base64,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
src=Path(os.environ.get('CLASSIC_SOURCE','/workspace/scratch/baccarat-faithful'));out=Path(os.environ.get('CLASSIC_COMPARE','/workspace/scratch/baccarat-classic-comparison'));out.mkdir(parents=True,exist_ok=True);base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
reference=json.loads((src/'source-round3.json').read_text());cards=[]
for frame in reference['frames']:
 for c in frame['cards']:
  if c['card'] not in cards:cards.append(c['card'])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':800,'height':1300});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/baccarat/index.html');page.add_style_tag(content='main{margin-top:206px}');page.locator('[data-classic=start]').click()
 # One legitimate100-chip win makes the reference's actual pre-round50100 balance.
 page.evaluate('''cards=>{const v=CLASSIC,c=v.controller,s=c.session.state,warm=[54,61,56,58],prefix=[...warm,...cards];s.shoe.order=[...prefix,...s.shoe.order.filter(x=>!prefix.includes(x))];s.shoe.cursor=s.shoe.burn=0;c.select('player');c.chip(100);c.confirm();c.session.skip();c.next();v.board();}''',cards)
 def snap(name):
  page.locator('canvas').screenshot(path=str(out/(name+'.png')));page.screenshot(path=str(out/(name+'-page.png')))
 snap('betting');page.locator('[data-classic="bet:player"]').click();snap('selected');page.locator('[data-classic="chip:100"]').click();page.wait_for_timeout(300);snap('wager')
 # Real full-page capture and real Phaser audio with common browser epoch timestamps.
 cdp=page.context.new_cdp_session(page);frames=out/'frames';frames.mkdir(exist_ok=True);stamps=[]
 def frame(e):
  (frames/f'{len(stamps):05d}.jpg').write_bytes(base64.b64decode(e['data']));stamps.append(e['metadata']['timestamp']);cdp.send('Page.screencastFrameAck',{'sessionId':e['sessionId']})
 cdp.on('Page.screencastFrame',frame);cdp.send('Page.startScreencast',{'format':'jpeg','quality':85,'everyNthFrame':1})
 epoch=page.evaluate('''()=>{const g=CLASSIC.g;window.mix=g.sound.context.createMediaStreamDestination();g.sound.masterGain.connect(mix);window.chunks=[];window.rec=new MediaRecorder(mix.stream);rec.ondataavailable=e=>chunks.push(e.data);rec.start();window.sceneLog=[];window.soundLog=[];window.playStart=performance.now();for(const s of Object.values(CLASSIC.sounds))s.onPlay.add(()=>soundLog.push({key:s.key,t:performance.now()-playStart}));window.sceneTimer=setInterval(()=>{const v=CLASSIC,s=v.controller.session.state;sceneLog.push({t:performance.now()-playStart,phase:s.phase,cards:v.cards.filter(c=>c.y>-100).map(c=>({x:c.x,y:c.y,width:c.width,height:c.height})),player:v.points.player.text,banker:v.points.banker.text,credit:v.numbers.credit.text,win:v.numbers.win.text})},16);return Date.now()/1000}''')
 page.locator('[data-classic=deal]').click();page.wait_for_timeout(250);snap('deal');page.wait_for_timeout(1600);snap('reveal');page.wait_for_timeout(1000);snap('result');expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible(timeout=10000);page.mouse.move(795,1290);page.wait_for_timeout(900);snap('settlement');page.wait_for_timeout(400);cdp.send('Page.stopScreencast')
 report=page.evaluate('''async()=>{clearInterval(sceneTimer);await new Promise(r=>{rec.onstop=r;rec.stop()});const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(const n of bytes)s+=String.fromCharCode(n);return{frames:sceneLog,sounds:soundLog,audio:btoa(s),receipt:CLASSIC.controller.session.state.round.receipt,dialog:[...document.querySelectorAll('.ui-dialog')].filter(n=>n.getBoundingClientRect().width).map(n=>({text:n.innerText,box:n.getBoundingClientRect().toJSON()}))}}''');(out/'audio.webm').write_bytes(base64.b64decode(report.pop('audio')));report.update(epoch=epoch,screenTimes=stamps,cards=cards,errors=errors);(out/'report.json').write_text(json.dumps(report,indent=2));assert not errors,errors;browser.close()
# Real source screenshot pairs; no card-shape re-composition or static mockup.
for name in ['betting','selected','wager','deal','reveal','result','settlement']:
 a=Image.open(src/f'source3-{name}-canvas.png').convert('RGB');b=Image.open(out/f'{name}.png').convert('RGB');pair=Image.new('RGB',(1280,990),'#fff');pair.paste(a,(0,30));pair.paste(b,(640,30));d=ImageDraw.Draw(pair);d.text((8,8),'REFERENCE',(0,0,0));d.text((648,8),'UNITY',(0,0,0));pair.save(out/f'pair-{name}.png')
# Epoch timing preserves frame durations; screen recording is not a performance test.
def encode(root,stamps,audio,epoch,dest):
 lines=[]
 for i,t in enumerate(stamps):lines.extend([f"file '{root/f'{i:05d}.jpg'}'",'duration '+str(max(.001,stamps[i+1]-t) if i+1<len(stamps) else .1)])
 listing=dest.with_suffix('.txt');listing.write_text('\n'.join(lines));offset=epoch-stamps[0];af=f'adelay={max(0,round(offset*1000))}:all=1' if offset>=0 else f'atrim=start={-offset},asetpts=PTS-STARTPTS'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-filter:a',af,'-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-r','30','-c:a','aac','-shortest',str(dest)],check=True)
encode(frames,stamps,out/'audio.webm',epoch,out/'unity-round.mp4');encode(src/'round3-frames',reference['screenTimes'],src/'source-round3-audio.webm',reference['epoch'],out/'reference-round.mp4');print('source/local same-hand screenshots, real video and audio saved',report['receipt'])
