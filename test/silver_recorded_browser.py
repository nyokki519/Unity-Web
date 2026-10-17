import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.goto('http://127.0.0.1:3461/silver-ring/index.html?seed=recorded')
 page.get_by_role('button',name='チャレンジ開始',exact=True).click()
 page.wait_for_function("()=>window.SILVER_GAME?.audio.samples.status==='ready'&&SILVER_GAME.refs.boardTex.userData.artwork==='ready'",timeout=60000)
 result=page.evaluate('''async()=>{const g=SILVER_GAME,a=g.audio;const durations=Object.fromEntries(Object.entries(a.samples.buffers).map(([k,v])=>[k,{duration:v.duration,channels:v.numberOfChannels}]));a.setMute(false);for(let i=0;i<3;i++)a.sinkWin(i);a.fanfare();return {durations,played:a.samples.playCount,art:g.refs.boardTex.userData.artwork}}''')
 assert result['played']['breakthrough']==3 and result['played']['jackpot']==1,result
 assert result['art']=='ready'
 page.screenshot(path='docs/qa/recorded-sounds/cabinet-390.png',timeout=60000)
 Path('docs/qa/recorded-sounds/integration.json').write_text(json.dumps(result,indent=2))
 print(result)
 b.close()
