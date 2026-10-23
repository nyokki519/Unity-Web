import json,argparse
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument("--url",default="http://127.0.0.1:3461");ap.add_argument("--output",default="docs/qa/mechanical/performance.json");args=ap.parse_args()
from playwright.sync_api import sync_playwright
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height in [(390,844),(1280,1000)]:
  page=b.new_page(viewport={'width':width,'height':height});page.goto(args.url+'/mechanical/index.html?inspect=1');page.wait_for_function('()=>window.mechanical!==undefined');page.click('#start');page.click('#auto');page.wait_for_timeout(500)
  r=page.evaluate('''()=>new Promise(resolve=>{const samples=[];let last=performance.now();function tick(t){samples.push(t-last);last=t;if(samples.length<61)requestAnimationFrame(tick);else {const s=samples.slice(1).sort((a,b)=>a-b);resolve({medianFrameMs:s[30],p95FrameMs:s[57],approxFramesPerSecond:1000/(s.reduce((a,b)=>a+b,0)/s.length),balls:mechanical.game.physics.balls.size});}}requestAnimationFrame(tick);})''');rows.append({'viewport':[width,height],'quality':'high',**r,'renderer':'Chromium SwiftShader software GPU, DPR1; not device Safari/GPU performance'});page.click('#quality');page.wait_for_timeout(500)
  light=page.evaluate('''()=>new Promise(resolve=>{const a=[];let last=performance.now();function f(t){a.push(t-last);last=t;if(a.length<61)requestAnimationFrame(f);else{const s=a.slice(1).sort((a,b)=>a-b);resolve({medianFrameMs:s[30],p95FrameMs:s[57],approxFramesPerSecond:1000/(s.reduce((a,b)=>a+b,0)/s.length),balls:mechanical.game.physics.balls.size});}}requestAnimationFrame(f);})''');rows.append({'viewport':[width,height],'quality':'light',**light,'renderer':'Chromium SwiftShader software GPU, DPR1; not device Safari/GPU performance'});page.close()
 b.close()
open(args.output,'w').write(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows))
