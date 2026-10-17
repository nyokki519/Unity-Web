from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,base64,struct
OUT=Path('docs/qa/kissa-atmosphere');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));expect.set_options(timeout=30000)
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=atmosphere&debug=1',wait_until='domcontentloaded');f=page.frame_locator('iframe.silver-game');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000);child=page.frames[1]
 # Read the actual host scroll range, then use the visible control to reserve space for browser chrome.
 page.get_by_role('button',name='操作欄を上に移動 ↓',exact=True).click();page.wait_for_function('()=>scrollY>20');page.wait_for_timeout(800)
 host=page.evaluate("()=>({scrollY,scrollHeight:document.documentElement.scrollHeight,viewport:innerHeight,bottom:document.querySelector('iframe').getBoundingClientRect().bottom})")
 assert host['scrollHeight']>host['viewport'];assert host['bottom']<=host['viewport']-95,host
 expect(f.locator('#mRand')).to_be_visible();expect(f.locator('#mCam')).to_be_visible()
 f.locator('#focusBowl').click();child.wait_for_function("()=>SILVER_GAME.S.manualCamera==='cradle1'");f.locator('#cameraRight').click();assert child.evaluate('SILVER_GAME.S.cameraYaw')==20
 f.locator('#mUp').focus();page.keyboard.down('Space');child.wait_for_function('()=>SILVER_GAME.S.cameraPitch>50',timeout=15000);page.keyboard.up('Space');pitch=child.evaluate('SILVER_GAME.S.cameraPitch');assert 50<pitch<=75
 # Explicit stage injection for short camera/visual checks; not evidence of natural entry odds.
 child.evaluate('SILVER_GAME.toBowl(0)');expect(f.locator('#bowlWhisper')).to_be_visible();expect(f.locator('#bowlWhisper')).to_have_text('ざわざわ…')
 child.evaluate('()=>{const g=SILVER_GAME;for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:1,freeCam:false})}');page.screenshot(path=str(OUT/'angle-zawa-safe-area.png'),timeout=60000)
 page.get_by_role('button',name='設定',exact=True).click();page.get_by_label('紙幣の背景演出',exact=True).uncheck();child.wait_for_function('()=>SILVER_GAME.refs.banknoteRain.layer.hidden');page.get_by_label('紙幣の背景演出',exact=True).check();child.wait_for_function('()=>!SILVER_GAME.refs.banknoteRain.layer.hidden')
 page.get_by_label('動きを減らす',exact=True).check();child.wait_for_function('()=>SILVER_GAME.refs.banknoteRain.layer.hidden');page.get_by_label('動きを減らす',exact=True).uncheck();page.get_by_role('button',name='設定',exact=True).click()
 # Confirm every successful aperture invokes the sound, while a losing aperture does not.
 f.locator('#mMute').click();child.wait_for_function('()=>!SILVER_GAME.S.muted')
 routing=child.evaluate("()=>{const g=SILVER_GAME,calls=[],results=[],old=g.audio.sinkWin.bind(g.audio),funds=g.S.funds;g.audio.sinkWin=t=>{calls.push(t);const result=old(t);results.push(result);return result};for(let tier=0;tier<3;tier++)g.sim.emit('sink',{tier,win:true,x:0,y:g.config.bowls.list[tier].cy,z:-.115});g.sim.emit('sink',{tier:0,win:false,x:0,y:.835,z:-.115});g.audio.sinkWin=old;return{calls,results,coinsUnchanged:g.S.funds===funds,activeGroups:g.audio.breakthroughBursts.length}}")
 assert routing['calls']==[0,1,2] and all(routing['results']) and routing['coinsUnchanged'];assert routing['activeGroups']<=4
 # Render the original synthesized sound offline, measuring the waveform rather than claiming a speaker test.
 sound=child.evaluate("""async()=>{const {playBreakthrough}=await import('/silver-ring/src/breakthrough-sound.js');const c=new OfflineAudioContext(1,48000,48000),master=c.createGain();master.gain.value=.85;master.connect(c.destination);const e={ctx:c,master,muted:true};const muted=playBreakthrough(e,0);e.muted=false;playBreakthrough(e,0);const b=await c.startRendering(),a=b.getChannelData(0);let peak=0,sum=0;for(const x of a){peak=Math.max(peak,Math.abs(x));sum+=x*x}const bytes=new Uint8Array(a.length*2),dv=new DataView(bytes.buffer);for(let i=0;i<a.length;i++)dv.setInt16(i*2,Math.max(-32768,Math.min(32767,Math.round(a[i]*32767))),true);let raw='';for(const x of bytes)raw+=String.fromCharCode(x);return{peak,rms:Math.sqrt(sum/a.length),mutedReturned:muted,pcm:btoa(raw)}}""")
 assert sound['mutedReturned'] is False and .01<sound['peak']<.8 and sound['rms']>.001,sound['peak'];pcm=base64.b64decode(sound.pop('pcm'));header=b'RIFF'+struct.pack('<I',36+len(pcm))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,1,48000,96000,2,16)+b'data'+struct.pack('<I',len(pcm));(OUT/'original-breakthrough.wav').write_bytes(header+pcm)
 art=child.evaluate("""async()=>{const {paintCabinetArt}=await import('/silver-ring/src/cabinet-art.js');const cv=document.createElement('canvas');cv.width=1024;cv.height=1700;paintCabinetArt(cv.getContext('2d'),1024,1700);return cv.toDataURL('image/png').split(',')[1]}""");(OUT/'original-cabinet-art.png').write_bytes(base64.b64decode(art))
 assert not errors,errors
 (OUT/'atmosphere.json').write_text(json.dumps({'host':host,'pitch':pitch,'yaw':20,'zawa':True,'banknotesToggle':True,'reducedStopsNotes':True,'soundRouting':routing,'offlineSound':sound,'errors':errors,'limits':'Chromium software rendering; simulated short viewport, not physical iPhone Safari. Explicit stage and sink events test presentation/wiring, not natural jackpot odds.'},ensure_ascii=False,indent=2));print('atmosphere passed',flush=True);b.close()
