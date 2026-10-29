"""Actual render and rAF cadence; no recording or concurrent benchmarks."""
import os,json,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ.get('CLASSIC_COMPARE','/workspace/scratch/baccarat-classic-comparison'));base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');reports=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,mobile in [(390,844,True),(1920,1080,False)]:
  page=b.new_page(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile);page.goto(base+'/baccarat/index.html');page.locator('[data-classic=start]').click();page.locator('[data-classic="bet:player"]').click();page.locator('[data-classic="chip:100"]').click();page.locator('[data-classic=deal]').click();expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible(timeout=12000);page.get_by_role('button',name='いいえ',exact=True).click();page.locator('[data-classic="bet:player"]').click();page.locator('[data-classic="chip:100"]').click()
  page.evaluate('''()=>{const g=CLASSIC.g,s=CLASSIC.controller.session.state,prefix=s.shoe.order.slice(0,s.shoe.cursor),cards=[2,9,4,6].map(rank=>Array.from({length:8},(_,d)=>rank+52*d).find(id=>!prefix.includes(id)));s.shoe.order=[...prefix,...cards,...s.shoe.order.slice(s.shoe.cursor).filter(id=>!cards.includes(id))];window.renderMarks=[];window.rafMarks=[];window.tasks=[];window.sampling=true;const render=g.renderer.render.bind(g.renderer);g.renderer.render=(...args)=>{renderMarks.push(performance.now());return render(...args)};window.start=performance.now();function frame(t){if(!sampling)return;rafMarks.push(t);requestAnimationFrame(frame)}requestAnimationFrame(frame);window.observer=new PerformanceObserver(l=>tasks.push(...l.getEntries().map(x=>x.duration)));observer.observe({type:'longtask',buffered:false});}''');page.locator('[data-classic=deal]').click();page.wait_for_timeout(8000);r=page.evaluate('''()=>{sampling=false;observer.disconnect();return{renderMarks,rafMarks,tasks,elapsed:performance.now()-start,renderType:CLASSIC.g.renderType,pluginLimit:30,heap:performance.memory?.usedJSHeapSize}}''');elapsed=r['elapsed'];render=r.pop('renderMarks');raf=r.pop('rafMarks');r.update(viewport=[width,height],mobile=mobile,warmRounds=1,actualRenders=len(render),renderFps=round(len(render)/elapsed*1000,2))
  for key,marks in [('draw',render),('raf',raf)]:
   deltas=sorted(y-x for x,y in zip(marks,marks[1:]));r[key+'MedianMs']=round(statistics.median(deltas),2);r[key+'P95Ms']=round(deltas[int(len(deltas)*.95)],2);r[key+'MaxMs']=round(max(deltas),2)
  r['note']='Headless Chromium/software GPU; source SaveCPU rendering cap30, rAF is not actual render FPS; not physical iPhone.';reports.append(r);page.close()
 b.close()
(out/'performance.json').write_text(json.dumps(reports,indent=2));print(json.dumps(reports))
