from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('docs/qa/visible-rain-zawa');OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=visible-rain')
  page.frame_locator('iframe').get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=60000)
  c=page.frames[1];c.wait_for_function("()=>SILVER_GAME.audio.samples.status==='ready'&&SILVER_GAME.refs.boardTex.userData.artwork==='ready'",timeout=60000)
  c.wait_for_function("()=>SILVER_GAME.refs.banknoteRain.layer.dataset.icon==='ready'")
  c.evaluate("()=>{const g=SILVER_GAME;g.S.manualCamera='wide';g.fx.setCamMode('WIDE');for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false});g.refs.maskBackground();g.refs.composer.render()}")
  c.wait_for_timeout(1200)
  margins=c.evaluate("()=>JSON.parse(SILVER_GAME.refs.banknoteRain.layer.dataset.exclusion)")
  assert margins['left']>=35 and width-margins['right']>=35,margins
  visible=c.evaluate("""()=>{const hole=JSON.parse(SILVER_GAME.refs.banknoteRain.layer.dataset.exclusion);return ['left','right'].map(side=>[...document.querySelectorAll('.unity-note[data-side='+side+']')].filter(n=>{const r=n.getBoundingClientRect(),l=side==='left'?0:hole.right,x=side==='left'?hole.left:innerWidth;return Math.min(r.right,x)-Math.max(r.left,l)>25&&Math.min(r.bottom,innerHeight-150)-Math.max(r.top,60)>20}).length)}""")
  assert all(n>=2 for n in visible),visible
  page.screenshot(path=str(OUT/f'outside-cabinet-{width}.png'),timeout=60000)
  c.evaluate("()=>{SILVER_GAME.audio.setMute(false);SILVER_GAME.S.muted=false;SILVER_GAME.toBowl(0)}")
  c.wait_for_function("()=>!document.getElementById('bowlWhisper').hidden&&!!SILVER_GAME.audio.samples.whisper",timeout=30000)
  result=c.evaluate("()=>({duration:SILVER_GAME.audio.samples.buffers.zawa.duration,loop:SILVER_GAME.audio.samples.whisper.source.loop,noteWidth:document.querySelector('.unity-note').getBoundingClientRect().width})")
  assert result['loop'] and result['noteWidth']>=150,result
  page.screenshot(path=str(OUT/f'large-rain-{width}.png'),timeout=60000)
  # Muting must remove the loop immediately; unmuting while the caption remains visible resumes it.
  c.evaluate('SILVER_GAME.audio.setMute(true)');assert c.evaluate('SILVER_GAME.audio.samples.whisper===null')
  c.evaluate('SILVER_GAME.audio.setMute(false)');c.wait_for_function('()=>!!SILVER_GAME.audio.samples.whisper')
  c.evaluate('SILVER_GAME.sim.balls.length=0');c.wait_for_function("()=>document.getElementById('bowlWhisper').hidden&&!SILVER_GAME.audio.samples.whisper")
  assert not errors,errors;rows.append({'width':width,**result,'backgroundMargins':margins,'visibleNotesOutsideCabinet':visible,'captionAudioStartsStops':True,'errors':errors});page.close()
 b.close()
(OUT/'zawa.json').write_text(json.dumps(rows,indent=2));print(rows)
