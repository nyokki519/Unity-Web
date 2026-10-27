import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_ACCOUNTING_QA_DIR','/tmp/silver-accounting-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/silver-ring/index.html?rev=credits1&seed=accounting')
 page.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000);page.locator('#btnStart').click()
 debit=page.evaluate('''()=>{const g=SILVER_GAME;let fired=0;for(let i=0;i<250;i++){g.sim.balls.length=0;g.sim.time+=.1;if(g.fire(.4))fired++;}g.sim.balls.length=0;return{fired,balance:g.S.funds,display:document.getElementById('fundsVal').textContent,extra:g.fire(.4)};}''')
 assert debit==dict(fired=250,balance=0,display='0枚',extra=False),debit
 page.wait_for_function("()=>SILVER_GAME.S.phase==='over'",timeout=30000);page.locator('#btnRetry').click()
 assert page.evaluate('SILVER_GAME.S.funds')==50000
 award=page.evaluate('''()=>{const g=SILVER_GAME,s=g.sim,C=g.config;g.S.funds=100;s.balls.length=0;
 s.spawnInBowl(0);const unqualified=g.S.funds;s.balls.length=0;
 const ball={id:999900,mode:'field',x:0,y:C.gate.y+.001,vx:0,vy:-.5,dead:false,bowlT:0};s.balls.push(ball);s.stepField(ball,.01);const gateOnly=g.S.funds;
 for(let i=0;i<240&&ball.mode==='script';i++)s.stepScript(ball,1/240);
 const awarded=g.S.funds;s.enterBowl(ball,0);const repeated=g.S.funds;s.balls.length=0;s.time+=.1;const used=g.fire(.4);
 return{unqualified,gateOnly,awarded,repeated,used,balance:g.S.funds,display:document.getElementById('fundsVal').textContent};}''')
 assert award==dict(unqualified=100,gateOnly=100,awarded=200,repeated=200,used=True,balance=0,display='0枚'),award
 page.wait_for_function("()=>SILVER_GAME.audio.samples.status==='ready'",timeout=60000)
 overlap=page.evaluate('''()=>{const a=SILVER_GAME.audio;a.setMute(false);const ok=a.replayEntry(),voice=a.samples.active.replayEntry.values().next().value;window.replayVoice=voice;window.replayStops=0;window.replayEnded=false;const stop=voice.source.stop.bind(voice.source),ended=voice.source.onended;voice.source.stop=(...args)=>{window.replayStops++;return stop(...args);};voice.source.onended=()=>{window.replayEnded=true;ended();};a.fanfare();return{ok,replay:a.samples.active.replayEntry.size,fanfare:a.samples.active.jackpot.size,duration:voice.source.buffer.duration};}''')
 assert overlap['ok'] and overlap['replay']==1 and overlap['fanfare']==1 and 1.6<overlap['duration']<1.8,overlap
 page.wait_for_function('()=>window.replayEnded',timeout=10000);assert page.evaluate('window.replayStops')==0
 for width in [375,390,414]:
  page.set_viewport_size({'width':width,'height':844});page.screenshot(path=str(out/f'credits-{width}.png'))
 assert not errors,errors
 (out/'report.json').write_text(json.dumps(dict(debit=debit,reset=50000,award=award,overlap=overlap,naturallyEnded=True,stopCalls=0,widths=[375,390,414],errors=errors),indent=2));print(json.dumps(dict(debit=debit,award=award,overlap=overlap,stopCalls=0)));b.close()
