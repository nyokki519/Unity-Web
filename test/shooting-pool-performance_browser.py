"""Compare full-capacity scans with the renderer's dense active list."""
import json, os
from pathlib import Path
from statistics import median
from playwright.sync_api import sync_playwright

base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
out=Path(os.environ.get('SHOOTING_QA_DIR','/tmp/shooting-pool-perf'))
out.mkdir(parents=True,exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/shooting/index.html');page.wait_for_function('()=>!!window.SHOOTING',timeout=90000)
    page.locator('[data-do=quickstart]').click();page.wait_for_function('()=>SHOOTING.game?.tick>20')
    report=page.evaluate('''async()=>{
      const {Game}=await import('./core.js');
      const results=[];
        for(const count of [64,512,2200]){
        const pool=new Game({seed:'active-benchmark'}).bullets;
        for(let i=0;i<count;i++)pool.add(30+i%420,40+i%640,0,30,{owner:0,life:40});
        const repeats=900,full=[],active=[];
        for(let warm=0;warm<3;warm++){let sink=0;for(let i=0;i<200;i++)for(let j=0;j<pool.capacity;j++)if(pool.active[j])sink+=j;for(let i=0;i<200;i++)for(const j of pool.renderIndices)sink+=j;window.__benchSink=sink;}
        for(let sample=0;sample<7;sample++){
          let sink=0,t=performance.now();
          if(sample%2===0){for(let i=0;i<repeats;i++)for(let j=0;j<pool.capacity;j++)if(pool.active[j])sink+=j;full.push(performance.now()-t);t=performance.now();for(let i=0;i<repeats;i++)for(const j of pool.renderIndices)sink+=j;active.push(performance.now()-t);}
          else{for(let i=0;i<repeats;i++)for(const j of pool.renderIndices)sink+=j;active.push(performance.now()-t);t=performance.now();for(let i=0;i<repeats;i++)for(let j=0;j<pool.capacity;j++)if(pool.active[j])sink+=j;full.push(performance.now()-t);}
          window.__benchSink=sink;
        }
        const sort=x=>[...x].sort((a,b)=>a-b),f=sort(full),a=sort(active);
        results.push({active:count,capacity:pool.capacity,repeats,fullScanMedianMs:f[3],activeListMedianMs:a[3],speedup:Number((f[3]/a[3]).toFixed(2)),fullScanP95Ms:f[6],activeListP95Ms:a[6]});
      }
      const g=SHOOTING.game;g.bullets.clear();for(let i=0;i<2200;i++)g.bullets.add(20+i%440,20+i%680,0,35,{owner:0,life:40,r:3});
      const draw=[];for(let sample=0;sample<5;sample++){const start=performance.now();for(let i=0;i<80;i++)SHOOTING.renderer.drawBullets(g,1);draw.push(performance.now()-start)}
      return {browser:navigator.userAgent,softwareRenderer:document.querySelector('#canvas').getContext('webgl2')?.getParameter(0x1F01),results,drawBullets2200:{calls:80,medianMs:[...draw].sort((a,b)=>a-b)[2]},pageWidth:document.documentElement.scrollWidth};
    }''')
    report['errors']=errors
    assert report['results'][-1]['speedup']>1,report
    assert not errors and report['pageWidth']==390,report
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2));browser.close()
