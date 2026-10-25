import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3481');ap.add_argument('--output',default='docs/qa/chinchiro-physics');args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width in [390,375,414]:
  page=browser.new_page(viewport={'width':width,'height':844},device_scale_factor=1,reduced_motion='no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro&&chinchiro.tray');page.click('#action');page.click('#action');page.wait_for_function('()=>chinchiro.tray.world!==null');page.click('#pause');assert page.evaluate('chinchiro.busy');tick=page.evaluate('chinchiro.tray.world.tick');page.wait_for_timeout(250);assert page.evaluate('chinchiro.tray.world.tick')==tick
  page.click('#motion');page.wait_for_function('()=>chinchiro.tray.groups.every(g=>!g.visible)')
  assert page.evaluate('chinchiro.tray.groups.every(g=>!g.visible)'),'reduced motion must affect WebGL rendering'
  page.click('#motion');page.click('#pause');page.wait_for_function('()=>!chinchiro.busy',timeout=30000)
  assert page.evaluate('chinchiro.tray.groups.every(g=>g.quaternion.toArray().every(Number.isFinite))')
  result=page.evaluate('chinchiro.tray.lastResult')
  if result['values']:assert page.evaluate('chinchiro.match.dice')==result['values']
  else:assert page.evaluate('chinchiro.match.attempt')==0
  page.click('#dice-zoom');assert page.evaluate('chinchiro.tray.zoomed');page.click('#dice-zoom')
  page.screenshot(path=str(out/f'dish-{width}.png'),full_page=True)
  if width==390:
   deadline=time.monotonic()+300
   while time.monotonic()<deadline:
    phase=page.evaluate('chinchiro.match.phase')
    if phase=='FINAL':break
    if page.locator('#pause').is_visible() and page.locator('#pause').inner_text()=='再開':page.click('#pause')
    elif page.locator('#action').is_enabled():page.click('#action')
    else:page.wait_for_timeout(180)
   assert page.evaluate('chinchiro.match.phase')=='FINAL'
   assert page.evaluate('chinchiro.match.players.reduce((s,p)=>s+p.coins,0)')==2000
   page.screenshot(path=str(out/'match-final.png'),full_page=True)
   page.click('#action');assert page.evaluate('chinchiro.tray.world') is None
   page.click('#action');page.click('#action');page.wait_for_function('()=>chinchiro.tray.world!==null');page.click('#restart');page.click('#confirm-restart');page.wait_for_timeout(600);assert page.evaluate('chinchiro.match.phase')=='BET';assert page.evaluate('chinchiro.match.attempt')==0;assert page.evaluate('chinchiro.tray.world') is None
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert errors==[],errors
  rows.append({'width':width,'errors':errors,'firstRoll':result,'checks':['physics pause','reduced WebGL motion','finite interpolation','physical-face transfer','zoom','no overflow']+(['CPU full match and retry'] if width==390 else [])});page.close()
 browser.close()
(out/'browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
