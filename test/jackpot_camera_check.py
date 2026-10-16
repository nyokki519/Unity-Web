"""Actual WebGL projection/buffer tests; desktop Chromium is not iPhone validation."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/qa/jackpot-camera');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('JACKPOT_QA_URL','http://127.0.0.1:3400');report={'screens':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for width in [375,390,414]:
  page=browser.new_page(viewport={'width':width,'height':int(width*1.6)},device_scale_factor=3);page.on('pageerror',lambda e:report['errors'].append(str(e)));page.route(base+'/camera-fixture',lambda route:route.fulfill(status=200,content_type='text/html',body='<!doctype html><html><head><title>Camera QA</title></head><body></body></html>'));page.goto(base+'/camera-fixture')
  result=page.evaluate('''async()=>{
   document.body.replaceChildren();document.body.style.margin='0';const c=document.createElement('canvas');c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';c.style.display='block';document.body.append(c);
   const{createSimulation}=await import('/js/abyss/si-engine.js');const{createRenderer}=await import('/js/abyss/si-renderer.js');window.g=createSimulation({seed:'abyss',initialBalls:1});window.r=createRenderer(c,g.board);
   g.fire(35);r.render(g,{camera:'auto',delta:1/60});const initial=r.getViewState();let steps=0;while(!g.balls.some(b=>b.zone==='tray')&&steps++<1200)g.step(1/240);if(!g.balls.some(b=>b.zone==='tray'))throw new Error('Normal launch did not enter cradle');
   const snapshot=JSON.stringify(g.snapshot());for(let i=0;i<3;i++)r.render(g,{camera:'auto',delta:.5});const entered=r.getViewState();if(JSON.stringify(g.snapshot())!==snapshot)throw new Error('Renderer modified physics');
   const mixed={...g,balls:[...g.balls,{id:999,stage:3,zone:'out',x:.25,y:.01,z:.1,r:.0055}]};r.render(mixed,{camera:'auto',delta:1/60});const mixedMode=r.getViewState().mode;
   const normal=entered.cameraDistance;r.setView({zoom:1.5});for(let i=0;i<3;i++)r.render(g,{camera:'cradle1',delta:.5});const zoomed=r.getViewState();r.setView({zoom:1});r.render(g,{camera:'cradle1',reducedMotion:true});const manualReduced=r.getViewState();
   return{initial,entered,mixedMode,zoomed,manualReduced,steps,physicsUnchanged:JSON.stringify(g.snapshot())===snapshot};
  }''')
  assert result['entered']['mode']=='cradle1';assert result['mixedMode']=='cradle1';assert result['entered']['pixelRatio']==3;assert result['entered']['buffer']['width']==width*3
  assert all(abs(pt['x'])<1 and abs(pt['y'])<1 for pt in result['entered']['bounds']),result
  assert result['zoomed']['cameraDistance']<result['entered']['cameraDistance']*.7
  assert result['manualReduced']['mode']=='cradle1';assert result['physicsUnchanged']
  assert page.locator('canvas').count()==1, page.evaluate('document.body.innerHTML');page.screenshot(path=str(out/f'auto-cradle-{width}-3x.png'));report['screens'].append({'width':width,**result});page.evaluate('r.dispose();g.dispose()');page.close()
 browser.close()
assert not report['errors'],report['errors'];(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print({'passedWidths':[r['width'] for r in report['screens']],'errors':report['errors']})
