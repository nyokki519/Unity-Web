import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3482');ap.add_argument('--output',default='docs/qa/chinchiro-metal/audio-browser.json');args=ap.parse_args()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(args.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro?.tray');assert page.evaluate('chinchiro.tray.sound.context') is None
 surface=page.evaluate('''()=>{const t=chinchiro.tray,c=t.materials[0].map.image.getContext('2d');return {metal:t.dieMaterial.metalness,roughness:t.finish.bowlMaterials.map(m=>m.roughness),groups:t.bowlGeometry.groups.length,cornerAlpha:c.getImageData(0,0,1,1).data[3]};}''');assert surface['metal']==1 and surface['cornerAlpha']==0 and surface['groups']==3
 page.click('#sound');page.wait_for_function('()=>chinchiro.tray.sound.enabled&&chinchiro.tray.sound.context.state==="running"');page.locator('#volume').evaluate("e=>{e.value=75;e.dispatchEvent(new Event('input',{bubbles:true}))}");assert abs(page.evaluate('chinchiro.tray.sound.volume')-.6)<1e-6
 page.evaluate('''()=>{const s=chinchiro.tray.sound,a=s.context.createAnalyser(),silent=s.context.createGain();silent.gain.value=0;a.fftSize=2048;s.output.connect(a);a.connect(silent);silent.connect(s.context.destination);window.audioProbe={a,peak:0};function f(){const v=new Float32Array(a.fftSize);a.getFloatTimeDomainData(v);audioProbe.peak=Math.max(audioProbe.peak,...v.map(Math.abs));requestAnimationFrame(f);}requestAnimationFrame(f);}''')
 page.click('#action');page.evaluate('''()=>{document.querySelector('#action').click();function pause(){if(chinchiro.tray.world&&chinchiro.busy&&!chinchiro.tray.world.done){document.querySelector('#pause').click();window.audioPaused=true;}else setTimeout(pause,0);}pause();}''');page.wait_for_function('()=>window.audioPaused');page.wait_for_timeout(100);assert page.evaluate('chinchiro.tray.sound.voices.size')==0;assert page.evaluate('chinchiro.tray.sound.output.gain.value')==0
 page.click('#pause');page.wait_for_function('()=>!chinchiro.busy',timeout=30000);page.wait_for_timeout(500)
 result=page.evaluate('''()=>({surface:null,stats:chinchiro.tray.sound.stats,peak:audioProbe.peak,voices:chinchiro.tray.sound.voices.size,context:chinchiro.tray.sound.context.state,quietPeak:(()=>{const a=new Float32Array(audioProbe.a.fftSize);audioProbe.a.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));})()})''');result['surface']=surface;assert result['stats']['impacts']>0;assert .0001<result['peak']<.99;assert result['voices']==0;assert result['quietPeak']<.00001
 frame=page.evaluate('chinchiro.tray.renderer.info.render.frame');page.wait_for_timeout(350);assert page.evaluate('chinchiro.tray.renderer.info.render.frame')==frame,'settled scene should not redraw continuously'
 page.evaluate('()=>{window.offStartImpacts=chinchiro.tray.sound.stats.impacts;chinchiro.tray.roll(123).then(r=>window.offRollResult=r);}')
 page.wait_for_function('()=>chinchiro.tray.world.tick>240&&chinchiro.tray.sound.stats.impacts>offStartImpacts+3&&!chinchiro.tray.world.done',timeout=30000)
 page.click('#sound');page.wait_for_function('()=>!chinchiro.tray.sound.enabled&&chinchiro.tray.sound.voices.size===0');off_tick=page.evaluate('chinchiro.tray.world.tick');page.wait_for_timeout(500)
 assert page.evaluate('chinchiro.tray.world.tick')>off_tick,'physics must continue while audio is OFF'
 assert page.evaluate('chinchiro.tray.sound.voices.size')==0
 result['offDuringActiveThrow']=True
 result['offGain']=page.evaluate('chinchiro.tray.sound.output.gain.value');result['offPeak']=page.evaluate('()=>{const a=new Float32Array(audioProbe.a.fftSize);audioProbe.a.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}');assert result['offPeak']<.00001
 assert errors==[],errors;result['errors']=errors;result['checks']=['sound defaults off','gesture unlock','volume','physics pause mutes','actual contact PCM','no clipping','silent settled','transparent ink','material groups','no settled redraw','OFF mutes ongoing contact audio while physics continues'];b.close()
Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
