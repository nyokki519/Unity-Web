"""Paired reproducible legal multi-deck fixture, warm round then three measured rounds.
Reports browser rAF cadence, not device FPS. No game RNG/probability inference.
"""
import os,json,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ.get('BACCARAT_PERF_OUT','/workspace/scratch/baccarat-controlled-perf'));out.mkdir(parents=True,exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,base in ([('after',os.environ.get('UNITY_URL','http://127.0.0.1:3483'))] if os.environ.get('PERF_AFTER_ONLY') else [('before',os.environ.get('BACCARAT_BEFORE_URL','http://127.0.0.1:3486')),('after',os.environ.get('UNITY_URL','http://127.0.0.1:3483'))]):
  for width,height in ([(1920,1080)] if os.environ.get('PERF_DESKTOP_ONLY') else [(390,844),(1920,1080)]):
   for style in (['standard'] if os.environ.get('PERF_DESKTOP_ONLY') else ['standard','rich']):
    page=b.new_page(viewport={'width':width,'height':height});page.add_init_script(f"localStorage.setItem('unity-baccarat-settings-v1',JSON.stringify({{presentation:'{style}',squeezeMode:'auto',bgm:0}}))");page.goto(base+'/baccarat/index.html');
    if os.environ.get('PERF_EXPERIMENT_CSS') and name=='after':page.add_style_tag(content=os.environ['PERF_EXPERIMENT_CSS'])
    page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();page.evaluate('''()=>{const s=BACCARAT.session.state,cards=[];for(let deck=0;deck<4;deck++)for(const id of [8,39,44,30,16])cards.push(id+52*deck);s.id='00000000-0000-4000-8000-000000000407';s.shoe.order=[...cards,...s.shoe.order.filter(c=>!cards.includes(c))];s.shoe.cursor=0;s.shoe.burn=0;}''')
    for round in range(4):
     if round==1:page.evaluate('''()=>{window.deltas=[];window.tasks=[];window.measure=true;window.mark=performance.now();window.obs=new PerformanceObserver(l=>tasks.push(...l.getEntries().map(e=>e.duration)));obs.observe({type:'longtask',buffered:false});const f=t=>{if(!measure)return;deltas.push(t-mark);mark=t;requestAnimationFrame(f)};requestAnimationFrame(f)}''')
     page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();expect(page.locator('[data-action=next]')).to_be_visible(timeout=25000);page.wait_for_timeout(350);page.locator('[data-action=next]').click()
    data=page.evaluate('''()=>{measure=false;obs.disconnect();return{deltas,tasks,heap:performance.memory?.usedJSHeapSize}}''');values=sorted(x for x in data.pop('deltas') if x>0);data.update(version=name,viewport=[width,height],style=style,warmRounds=1,measuredRounds=3,frames=len(values),medianMs=statistics.median(values),p95Ms=values[int(len(values)*.95)],maxMs=max(values),note='Headless Chromium rAF callback cadence; fixed legal shoe and same cosmetic round IDs; not physical iPhone or display FPS.');results.append(data);page.close();(out/'performance.json').write_text(json.dumps(results,indent=2));print(json.dumps(data),flush=True)
 b.close()
