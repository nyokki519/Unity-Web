from playwright.sync_api import sync_playwright
from pathlib import Path
import json,statistics,os
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_QA_DIR','/tmp/baccarat-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1920,'height':1080})
 page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>!!window.BACCARAT');page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click()
 page.evaluate("()=>{window.intervals=[];window.mark=performance.now();window.stopMeasure=false;window.longTasks=[];try{new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:false})}catch{};function frame(t){if(window.stopMeasure)return;intervals.push(t-mark);mark=t;requestAnimationFrame(frame)};requestAnimationFrame(frame)}")
 for i in range(3):
  page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=15000);page.locator('[data-action=next]').click()
 data=page.evaluate('()=>{window.stopMeasure=true;return{intervals,longTasks,dom:document.querySelectorAll("*").length,heap:performance.memory?.usedJSHeapSize}}');values=sorted(x for x in data.pop('intervals') if x>0)
 data.update(viewport=[1920,1080],frames=len(values),medianRAFms=statistics.median(values),p95RAFms=values[int(len(values)*.95)],maxRAFms=max(values),note='Chromium requestAnimationFrame callback cadence during three normal-speed rounds; NOT measured physical display FPS or iPhone performance.')
 (out/'performance.json').write_text(json.dumps(data,indent=2));page.screenshot(path=str(out/'desktop-1920.png'));print(json.dumps(data));b.close()
