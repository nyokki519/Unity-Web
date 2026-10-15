"""Real browser Worker execution without WebGL rendering contention."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page();page.goto('http://127.0.0.1:3400/')
    result=page.evaluate('''async()=>{
      async function run(mode,trials,seed,pause=false){
        const start=performance.now();
        return await new Promise((resolve,reject)=>{
          const worker=new Worker('/js/abyss/research-worker.js',{type:'module'});let paused=false,progress=0;
          const timeout=setTimeout(()=>{worker.terminate();reject(Error('Worker timeout'))},120000);
          worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message));};
          worker.onmessage=({data})=>{
            if(data.type==='error'){clearTimeout(timeout);worker.terminate();reject(Error(data.message));return;}
            if(data.type==='progress'){progress++;if(pause&&!paused){paused=true;worker.postMessage({type:'pause'});setTimeout(()=>worker.postMessage({type:'resume'}),100);}}
            if(data.type==='result'){clearTimeout(timeout);worker.terminate();resolve({...data,seconds:(performance.now()-start)/1000,progress,pauseResume:paused});}
          };
          worker.postMessage({type:'start',id:1,mode,trials,seed,difficulty:'easy',power:55,angle:-103});
        });
      }
      const a=await run('approximate',1000000,'worker-qa',true),b=await run('approximate',1000000,'worker-qa');
      if(JSON.stringify(a.counts)!==JSON.stringify(b.counts))throw Error('Seed mismatch');
      const physical=await run('physics',1000,'worker-physical',true);
      return {approximate:a,approximateRepeatIdentical:true,physical};
    }''')
    browser.close()
assert result['approximate']['completed']==1000000
assert result['physical']['completed']==1000
assert result['physical']['timeouts']==0
for data in [result['approximate'],result['physical']]:
    for row in data['rows']:
        assert 0<=row['passed']<=row['reached']
        assert row['rate'] is None or 0<=row['rate']<=1
out=Path('docs/qa/abyss/worker-report.json');out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k: {'completed':v['completed'],'seconds':v['seconds'],'timeouts':v['timeouts'],'pauseResume':v['pauseResume']} if isinstance(v,dict) else v for k,v in result.items()},ensure_ascii=False))
