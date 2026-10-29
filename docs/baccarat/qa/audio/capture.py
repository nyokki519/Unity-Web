from playwright.sync_api import sync_playwright
import json,time
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--autoplay-policy=no-user-gesture-required','--no-sandbox'])
 page=b.new_page();page.goto('http://127.0.0.1:3484/baccarat/')
 report=page.evaluate('''async()=>{
 const {Audio}=await import('/baccarat/audio.js');const a=new Audio();
 await a.resume({bgm:.22,se:.7,ui:.5,forecastVolume:.5,resultVolume:.65});await a.loading;
 const dest=a.ctx.createMediaStreamDestination();a.master.connect(dest);
 const recorder=new MediaRecorder(dest.stream),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
 const meter=a.ctx.createAnalyser();meter.fftSize=2048;a.master.connect(meter);let peak=0,sum=0,count=0,maxVoices=0;
 const poll=setInterval(()=>{const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);for(const v of data){peak=Math.max(peak,Math.abs(v));sum+=v*v;count++;}maxVoices=Math.max(maxVoices,a.active)},10);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 for(const kind of ['chip','chip','lock','card','land','third','card','land']){a.event(kind);await wait(200)}
 a.hint('red','trace');await wait(450);a.roundResult({net:100000,lines:[]});await wait(2500);
 clearInterval(poll);await new Promise(r=>{recorder.onstop=r;recorder.stop()});
 const buf=await new Blob(chunks).arrayBuffer();let str='';for(const v of new Uint8Array(buf))str+=String.fromCharCode(v);
 const report={loaded:[...a.samples.keys()],peak,rms:Math.sqrt(sum/count),maxVoices,remainingVoices:a.active,musicError:!!a.musicError,recording:btoa(str)};a.suspend();return report;
}''')
 import base64
 open('docs/baccarat/qa/audio/table-mix.webm','wb').write(base64.b64decode(report.pop('recording')))
 open('docs/baccarat/qa/audio/browser-mix.json','w').write(json.dumps(report,indent=2))
 print(json.dumps(report));b.close()
