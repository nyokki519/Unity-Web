from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,os
OUT=Path(os.environ.get('SILVER_QA_DIR','docs/qa/silver-ring'));OUT.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));expect.set_options(timeout=30000)
 page.goto(os.environ.get('SILVER_QA_URL','http://127.0.0.1:3461')+'/?bonus=jackpot&debug=1&seed=outcomes',wait_until='domcontentloaded');f=page.frame_locator('iframe.silver-game');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=45000);child=page.frames[1];child.wait_for_function('()=>window.SILVER_GAME?.S.phase==="play"',timeout=30000)
 child.evaluate('()=>{for(let i=0;i<40;i++)SILVER_GAME.toBowl(0)}');assert child.evaluate('SILVER_GAME.sim.liveCount()')<=30,'Practice injection must enforce live-ball limit'
 child.evaluate('SILVER_GAME.sim.balls.length=0')
 f.locator('#mMute').click();child.wait_for_function('()=>SILVER_GAME.audio.master.gain.value>.5',timeout=10000);f.locator('#mMute').click();child.wait_for_function('()=>SILVER_GAME.audio.master.gain.value<.001',timeout=10000)
 f.locator('#devPanel > summary').click();f.get_by_role('button',name='大当たり演出',exact=True).click();expect(f.locator('#jack')).to_have_class('show');page.screenshot(path=str(OUT/'jackpot.png'),timeout=45000)
 child.wait_for_function('()=>!SILVER_GAME.S.jackpotLock',timeout=20000);assert child.evaluate('SILVER_GAME.S.funds')==1050000
 f.get_by_role('button',name='玉切れ',exact=True).click();expect(f.get_by_role('button',name='もう一度遊ぶ（5万枚）',exact=True)).to_be_visible();page.screenshot(path=str(OUT/'gameover.png'),timeout=45000)
 f.get_by_role('button',name='もう一度遊ぶ（5万枚）',exact=True).click();assert child.evaluate('SILVER_GAME.S.funds')==50000;assert child.evaluate('SILVER_GAME.S.fired')==0;assert child.evaluate('SILVER_GAME.S.phase')=='play'
 page.get_by_role('button',name='設定',exact=True).click();page.get_by_label('動きを減らす',exact=True).check();child.wait_for_function("()=>document.body.classList.contains('reduced')");page.get_by_role('button',name='設定',exact=True).click()
 f.get_by_role('button',name='大当たり演出',exact=True).click();assert child.evaluate("getComputedStyle(document.querySelector('#flash')).display")=='none'
 assert not errors,errors
 (OUT/'outcomes.json').write_text(json.dumps({'practiceCap':30,'audioOnOff':True,'jackpotReward':1000000,'gameoverRetry':True,'reducedFlashOff':True,'errors':errors,'note':'Explicit practice/debug operations for short outcome verification, not natural-launch odds.'},ensure_ascii=False,indent=2));print('outcomes passed',flush=True);b.close()
