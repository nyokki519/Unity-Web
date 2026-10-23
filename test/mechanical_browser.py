"""Real Chromium/WebGL smoke, fixture flow explicitly separate from normal fire."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3461');ap.add_argument('--output',default='docs/qa/mechanical');ap.add_argument('--widths',type=int,nargs='+',choices=[375,390,414,1280],default=[375,390,414,1280]);args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height in [(w,{375:812,390:844,414:896,1280:1000}[w]) for w in args.widths]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=width<500,reduced_motion='reduce')
  page=context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto(args.url+'/mechanical/index.html?inspect=1');page.wait_for_function('() => window.mechanical && !document.querySelector("#start").disabled',timeout=60000)
  assert page.locator('#welcome').evaluate('(e)=>e.open')
  page.click('#start');page.click('#fire');page.wait_for_timeout(150);assert page.evaluate('mechanical.game.ledger.fired')>=1
  page.click('#auto');page.wait_for_timeout(1000);assert page.locator('#auto').get_attribute('aria-pressed')=='true'
  page.click('#finish');assert page.evaluate('''async()=>{const {replaySession}=await import('/mechanical/src/game.js');const r=await replaySession(mechanical.game.replayData());const same=JSON.stringify(r.snapshot())===JSON.stringify(mechanical.game.snapshot());r.dispose();return same;}''')
  page.keyboard.press('Escape');assert page.locator('#result').evaluate('(e)=>e.open');page.click('#retry');page.wait_for_function('()=>mechanical.game.ledger.fired===0')
  page.click('#sound');assert page.locator('#sound').get_attribute('aria-pressed')=='true';page.wait_for_function('()=>mechanical.audio.master.gain.value===1');page.click('#sound');assert page.locator('#sound').get_attribute('aria-pressed')=='false';page.wait_for_function('()=>mechanical.audio.master.gain.value===0')
  page.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden");assert page.evaluate('mechanical.game.paused');page.click('#pause')
  page.click('#pause');tick=page.evaluate('mechanical.game.tick');page.wait_for_timeout(200);assert page.evaluate('mechanical.game.tick')==tick
  page.click('#pause');page.wait_for_function(f'() => mechanical.game.tick > {tick}')
  page.click('#pause');page.select_option('#camera',label='役物');page.click('#pan-down');assert page.locator('#camera').input_value()=='自由'
  page.click('#pan-up');page.click('#zoom-in');page.click('#zoom-out')
  page.click('#quality');assert page.locator('#quality').get_attribute('aria-pressed')=='false';assert page.locator('#board').evaluate('(c)=>c.width <= c.clientWidth*.51');page.click('#quality');assert page.locator('#quality').get_attribute('aria-pressed')=='true'
  # End-to-end state fixture: genuine physics from each specified position, no outcome override.
  page.evaluate('''() => {const g=mechanical.game;for(const b of [...g.physics.balls.values()]){g.ledger.recover(b.id,'test-cleanup');g.physics.remove(b.id);}g.command('pause',false);g.fixture('v');for(let i=0;i<120;i++)g.step();g.command('pause',true);}''')
  assert page.evaluate('mechanical.game.phase')=='START'
  page.evaluate('''() => {const g=mechanical.game;g.command('pause',false);g.fixture('start');for(let i=0;i<100;i++)g.step();g.fixture('attacker');for(let i=0;i<100;i++)g.step();g.command('pause',true);}''')
  assert page.evaluate('mechanical.game.stats.attacker')>=1;assert page.evaluate('mechanical.game.ledger.valid()')
  page.select_option('#camera',label='役物');page.wait_for_timeout(200);page.locator('.viewport').screenshot(path=str(out/f'role-{width}.png'))
  page.select_option('#camera',label='全体');page.wait_for_timeout(200);page.screenshot(path=str(out/f'playing-{width}.png'),full_page=True)
  layout=page.evaluate('''() => ({overflow:document.documentElement.scrollWidth>innerWidth,fireHeight:document.querySelector('#fire').getBoundingClientRect().height,canvasWidth:document.querySelector('#board').getBoundingClientRect().width,scrollable:document.documentElement.scrollHeight>innerHeight})''');assert not layout['overflow'];assert layout['fireHeight']>=44
  page.click('#finish');assert page.locator('#result').evaluate('(e)=>e.open');page.click('#retry');page.wait_for_function('() => mechanical.game.ledger.fired===0');assert page.evaluate('mechanical.game.ledger.stock')==250
  assert errors==[],errors
  results.append({'viewport':[width,height],'layout':layout,'pageErrors':errors,'checks':['initial-dialog','manual-fire','auto-fire','pause/resume','free-camera-pan','role-camera','physical-V/start/payout-fixtures','ledger','result/retry','finished-auto-replay','result-Escape-guard','quality-toggle-with-same-engine','sound-toggle','synthetic-hidden-handler'],'limitations':'Chromium software GPU; not physical iPhone Safari. Fixtures do not establish normal-shot success rate.'});context.close()
 browser.close()
(out/'browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False))
