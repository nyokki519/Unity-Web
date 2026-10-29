"""Result actions stay immediately usable; presentation timelines cannot leak across scenes."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844})
 page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000)
 page.evaluate("SHOOTING.start({seed:'art-life',difficulty:'easy'})")
 # A new launch must cancel an in-flight staged boss defeat.
 page.evaluate("SHOOTING.renderer.event({type:'explosion',boss:true,x:150,y:200});SHOOTING.start({seed:'fresh',difficulty:'easy'});SHOOTING.pause()")
 count=page.evaluate('SHOOTING.renderer.sequences.length');assert count==0,count
 # Trigger real completion and inspect controls in the first result frame.
 state=page.evaluate('''async()=>{SHOOTING.resume();SHOOTING.game.completeStage();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const next=document.querySelector('[data-do=next]');next.focus();return{nextVisible:getComputedStyle(next).visibility,focused:document.activeElement===next,hit:document.elementFromPoint(next.getBoundingClientRect().x+15,next.getBoundingClientRect().y+15)===next};}''')
 out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/art-pass'));out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'result-actions-immediate-390.png'))
 assert state=={'nextVisible':'visible','focused':True,'hit':True},state
 page.keyboard.press('Enter');page.wait_for_function('SHOOTING.game.stage===1');assert page.evaluate('SHOOTING.renderer.sequences.length')==0
 page.evaluate("SHOOTING.renderer.event({type:'bomb',x:240,y:300});SHOOTING.navigate('title')")
 clean=page.evaluate('''()=>{const r=SHOOTING.renderer;return{sequences:r.sequences.length,particles:r.particles.length,rings:r.rings.length,smoke:r.smokes.length,debris:r.fragments.length,shake:r.shake,flash:r.flash};}''');assert all(v==0 for v in clean.values()),clean
 page.route('**/art/stage-*.webp',lambda route:route.abort());page.reload();page.wait_for_function('SHOOTING.renderer.paintedFailures.length===6',timeout=15000);page.evaluate("SHOOTING.start({seed:'fallback',difficulty:'easy'})");page.wait_for_timeout(500);fallback=page.evaluate('!SHOOTING.renderer.paintedTextures.some(Boolean)&&SHOOTING.renderer.renderer.info.render.calls>0');assert fallback;page.screenshot(path=str(out/'procedural-fallback-390.png'))
 report={'fallbackRenders':fallback,'immediateNext':state,'presentationCleared':clean};(out/'lifecycle-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
