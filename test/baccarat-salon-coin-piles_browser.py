"""Coin-native field selection, stack persistence and failed-write recovery."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path(os.environ.get('SALON_COIN_QA','/tmp/salon-coin-qa'));out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/baccarat/index.html');page.wait_for_function('()=>window.SALON?.ready');page.screenshot(path=str(out/'title.png'),full_page=True);page.locator('[data-action=start]').tap();page.locator('[data-action="bet:player"]').tap()
 for i in range(3):page.locator('[data-action="chip:100"]').tap();page.wait_for_timeout(120)
 page.locator('[data-action="bet:banker"]').tap()
 for i in range(2):page.locator('[data-action="chip:500"]').tap();page.wait_for_timeout(120)
 page.wait_for_timeout(300);page.screenshot(path=str(out/'piles.png'),full_page=True);s=page.evaluate('()=>SALON.controller.session.state');assert s['bets']=={'player':30000,'banker':100000};assert s['balance']==5000000
 assert page.locator('[data-action="bet:player"] .salon-bet-coins img').count()==3;assert page.locator('[data-action="bet:banker"] .salon-bet-coins img').count()==2
 page.locator('[data-action=undo]').tap();assert page.evaluate('()=>SALON.controller.session.state.bets.banker')==50000
 page.reload();page.locator('[data-action=resume]').tap();assert page.locator('[data-action="bet:player"] .salon-bet-coins img').count()==3;assert page.locator('[data-action="bet:banker"] .salon-bet-coins img').count()==1
 page.evaluate('()=>{window.savedCommit=SALON.controller.session.commit;SALON.controller.session.commit=()=>false}')
 page.locator('[data-action="bet:tie"]').tap();page.locator('[data-action="chip:10"]').tap();assert page.evaluate('()=>SALON.controller.session.state.bets.tie||0')==0;assert page.locator('[data-action="bet:tie"] .salon-bet-coins img').count()==0
 page.evaluate('()=>SALON.controller.session.commit=savedCommit');page.locator('[data-action=retry]:visible').first.tap();assert page.evaluate('()=>SALON.controller.session.state.bets.tie')==1000;assert page.locator('[data-action="bet:tie"] .salon-bet-coins img').count()==1
 assert page.locator('img[src*="unity-baccarat-wordmark"]').count()==2;assert page.locator('img[src*="reference/images/tip_"]').count()==0
 for w,h in [(375,812),(414,896),(1440,900)]:
  page.set_viewport_size({'width':w,'height':h});page.screenshot(path=str(out/f'piles-{w}.png'),full_page=True);assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
 (out/'report.json').write_text(json.dumps({'presses':5,'playerPile':3,'bankerPile':2,'walletUnchangedBeforeConfirm':True,'undoAndReloadPilesMatch':True,'failedCoinRetryAddsOnce':True,'originalWordmarkAndCoins':True,'widths':[375,390,414,1440]},indent=2));assert not errors,errors;b.close()
print('coin stacking, undo, reload and widths passed')
