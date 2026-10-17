from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
OUT=Path('docs/qa/resume-rain');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':650},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3461/?bonus=jackpot&seed=resume-rain');f=page.frame_locator('iframe');f.get_by_role('button',name='チャレンジ開始',exact=True).tap(timeout=60000);child=page.frames[1]
 page.get_by_role('button',name='一時停止',exact=True).tap();child.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");resume=page.get_by_role('button',name='再開する',exact=True);expect(resume).to_be_visible(timeout=10000)
 resume.evaluate('(el)=>{el.click();el.click()}');child.wait_for_function("()=>SILVER_GAME.S.phase==='play'",timeout=10000)
 before=child.evaluate('SILVER_GAME.sim.time');child.wait_for_function('(before)=>SILVER_GAME.sim.time>before+.025',arg=before,timeout=30000)
 page.get_by_role('button',name='一時停止',exact=True).tap();child.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");f.get_by_role('button',name='ここから再開',exact=True).tap();child.wait_for_function("()=>SILVER_GAME.S.phase==='play'")
 before=child.evaluate('SILVER_GAME.sim.time');child.wait_for_function('(before)=>SILVER_GAME.sim.time>before+.025',arg=before,timeout=30000)
 page.screenshot(path=str(OUT/'resumed-mobile.png'),timeout=60000);assert not errors,errors
 (OUT/'resume.json').write_text(json.dumps({'repeatedResume':True,'localResume':True,'physicsAdvancesAfterBoth':True,'touchEmulation':True,'errors':errors,'physicalSafari':False},indent=2));print('resume passed',flush=True);b.close()
