"""Idle DOM cadence and real curl input CPU submission; not GPU/compositor FPS."""
import os,json,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ.get('SALON_PERF','/workspace/scratch/salon-perf.json'));base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');results=[]
def summary(values):
 values=sorted(values);return {'count':len(values),'medianMs':round(statistics.median(values),2),'p95Ms':round(values[min(len(values)-1,int(len(values)*.95))],2),'maxMs':round(max(values),2)}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,mobile in [(390,844,True),(1920,1080,False)]:
  page=b.new_page(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile);page.goto(base+'/baccarat/index.html');page.locator('[data-action=start]').click();page.wait_for_timeout(200)
  idle=page.evaluate('''async()=>{const marks=[];const end=performance.now()+1500;await new Promise(resolve=>{function f(t){marks.push(t);if(performance.now()<end)requestAnimationFrame(f);else resolve()}requestAnimationFrame(f)});return marks.slice(1).map((x,i)=>x-marks[i])}''')
  page.evaluate("()=>{SALON.settings.squeeze='all';SALON.settings.reduced=false}");page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();expect(page.locator('.salon-squeeze__canvas')).to_be_visible(timeout=12000)
  page.evaluate('''()=>{window.curlCosts=[];const v=SALON.squeeze,draw=v.draw.bind(v);v.draw=()=>{const t=performance.now();draw();curlCosts.push(performance.now()-t)}}''');stage=page.locator('.salon-squeeze__stage');box=stage.bounding_box();x=box['x']+box['width']*.7;y=box['y']+box['height']*.85;page.mouse.move(x,y);page.mouse.down()
  for i in range(1,45):page.mouse.move(x-20*i/44,y-box['height']*.45*i/44);page.wait_for_timeout(16)
  page.mouse.up();r=page.evaluate('''()=>({draws:curlCosts,textureWidth:SALON.squeeze.graphics.frontTexture.image.width,textureHeight:SALON.squeeze.graphics.frontTexture.image.height,heap:performance.memory?.usedJSHeapSize})''');results.append({'viewport':[width,height],'mobileEmulation':mobile,'idleRafIntervals':summary(idle),'curlCpuSubmit':summary(r.pop('draws')),**r,'limit':'Headless Chromium/software GPU, no recording/concurrent benchmarks. rAF interval is not measured compositor FPS. Curl timing includes CPU/WebGL submission, not GPU completion. Physical iPhone/Safari unverified.'});page.close()
 b.close()
out.write_text(json.dumps(results,indent=2));print(json.dumps(results))
