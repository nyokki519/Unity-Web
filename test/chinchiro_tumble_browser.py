"""Real UI gesture checks; does not replace the physics or roll outcomes."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3482');ap.add_argument('--output',default='docs/qa/chinchiro-tumble/browser');args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width in [390,375,414]:
  page=b.new_page(viewport={'width':width,'height':844},reduced_motion='no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(args.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro?.tray')
  camera=page.evaluate('chinchiro.tray.camera.position.toArray()');page.click('#action');page.click('#action')
  page.wait_for_function('()=>chinchiro.tray.world?.tick>480&&!chinchiro.tray.world.done',timeout=30000)
  page.click('#pause');page.wait_for_timeout(300)
  state=page.evaluate('''()=>{const t=chinchiro.tray,w=t.world;return {tick:w.tick,bowl:w.bowlBody.translation(),draw:t.bowlGroup.position.toArray(),rotation:w.bowlBody.rotation(),drawRotation:t.bowlGroup.quaternion.toArray(),dice:w.poses()};}''')
  assert max(abs(state['draw'][i]-state['bowl'][k]) for i,k in enumerate(['x','y','z']))<1e-7
  assert max(abs(state['drawRotation'][i]-state['rotation'][k]) for i,k in enumerate(['x','y','z','w']))<1e-7
  page.screenshot(path=str(out/f'rolling-{width}.png'),full_page=True);page.wait_for_timeout(300)
  assert page.evaluate('chinchiro.tray.world.tick')==state['tick']
  assert page.evaluate('chinchiro.tray.world.poses()')==state['dice']
  assert page.evaluate('chinchiro.tray.camera.position.toArray()')==camera
  page.click('#motion');page.wait_for_function('()=>chinchiro.tray.groups.every(g=>!g.visible)&&chinchiro.tray.bowlGroup.position.length()===0')
  page.click('#motion');page.click('#pause');page.wait_for_function('()=>!chinchiro.busy',timeout=30000)
  result=page.evaluate('chinchiro.tray.lastResult');assert result['seconds']<=12
  if result['values']:assert page.evaluate('chinchiro.match.dice')==result['values']
  else:assert page.evaluate('chinchiro.match.attempt')==0
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert errors==[],errors
  rows.append({'width':width,'pausedTick':state['tick'],'result':result,'errors':errors,'checks':['visible and collision bowl poses agree','dice and bowl pause together','camera does not shake','reduced motion hides dish movement','resume and actual physical results','no horizontal overflow']});page.close()
 b.close()
(out/'browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
