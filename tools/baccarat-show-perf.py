"""rAF cadence, not physical phone FPS; automatic presentation over real live rounds."""
import os,json,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482');out=Path(os.environ.get('BACCARAT_SHOW_QA','/tmp/baccarat-show-qa'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);results=[]
 for width,height in [(390,844),(1920,1080)]:
  page=b.new_page(viewport={'width':width,'height':height});page.add_init_script("localStorage.setItem('unity-baccarat-settings-v1',JSON.stringify({presentation:'rich',squeezeMode:'auto',bgm:0}))");page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>!!window.BACCARAT');page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();page.evaluate("()=>{window.intervals=[];window.mark=performance.now();window.stopMeasure=false;window.longTasks=[];try{new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:false})}catch{};function frame(t){if(window.stopMeasure)return;intervals.push(t-mark);mark=t;requestAnimationFrame(frame)};requestAnimationFrame(frame)}")
  for i in range(3):
   page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=20000);page.locator('[data-action=next]').click()
  data=page.evaluate('()=>{window.stopMeasure=true;return{intervals,longTasks,dom:document.querySelectorAll("*").length,heap:performance.memory?.usedJSHeapSize}}');values=sorted(x for x in data.pop('intervals') if x>0);data.update(viewport=[width,height],rounds=3,style='rich / auto squeeze',frames=len(values),medianRAFms=statistics.median(values),p95RAFms=values[int(len(values)*.95)],maxRAFms=max(values),note='Headless Chromium rAF cadence. Not physical FPS or iPhone/Safari certification.');results.append(data);page.close()
 (out/'performance.json').write_text(json.dumps(results,indent=2));print(json.dumps(results));b.close()
