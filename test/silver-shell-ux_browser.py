"""Focused settings/input regression; desktop Chromium emulation, not a physical iPhone."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_UX_DIR','docs/qa/ux-audit-retro'));out.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w,h in [(375,667),(390,844),(414,896),(1440,900)]:
  page=b.new_page(viewport={'width':w,'height':h},has_touch=w<500);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3482')+'/?bonus=jackpot&seed=ux-audit');page.wait_for_selector('iframe.silver-game');f=page.frames[1];f.wait_for_function('()=>!!window.SILVER_GAME',timeout=90000)
  f.locator('#btnStart').click();f.wait_for_function("()=>SILVER_GAME.S.phase==='play'")
  before=page.locator('iframe.silver-game').bounding_box()
  page.get_by_role('button',name='設定',exact=True).click();after=page.locator('iframe.silver-game').bounding_box()
  assert before['y']==after['y'] and before['height']==after['height'],(before,after)
  panel=page.locator('.silver-options').bounding_box();assert panel['y']>=0 and panel['y']+panel['height']<=h,(w,panel)
  assert page.get_by_role('button',name='設定を閉じる ×',exact=True).is_visible()
  page.get_by_role('button',name='発射威力を2%上げる',exact=True).evaluate('(b)=>{b.click();b.click();}')
  f.wait_for_function('()=>Math.abs(SILVER_GAME.S.memory-.44)<.001')
  assert page.locator('.silver-strength input').get_attribute('aria-valuetext')=='44%'
  page.screenshot(path=str(out/f'after-settings-{w}.png'))
  page.keyboard.press('Escape');assert not page.locator('.silver-options').is_visible();assert page.get_by_role('button',name='設定',exact=True).evaluate('(b)=>document.activeElement===b')
  page.get_by_role('button',name='設定',exact=True).click();page.get_by_label('表示する場所').select_option('cradle1');assert not page.locator('.silver-options').is_visible()
  f.wait_for_function("()=>SILVER_GAME.S.manualCamera==='cradle1'");f.locator('#singleShot').click();assert f.evaluate('SILVER_GAME.S.fired')==1;assert f.evaluate('SILVER_GAME.S.funds')==49800
  assert f.locator('#mAuto').get_attribute('aria-pressed')=='false';assert f.locator('#mTilt').get_attribute('aria-pressed')=='false';f.locator('#mCam').click();assert f.locator('#mCam').get_attribute('aria-pressed')=='true';f.locator('#mCam').click()
  page.get_by_role('button',name='一時停止',exact=True).click();f.wait_for_function("()=>SILVER_GAME.S.phase==='paused'");page.get_by_role('button',name='再開する',exact=True).click();f.wait_for_function("()=>SILVER_GAME.S.phase==='play'")
  page.screenshot(path=str(out/f'after-play-{w}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate("window.__retroAudio=document.querySelector('iframe.silver-game').contentWindow.SILVER_GAME.audio.ctx");page.get_by_role('button',name='Unity MIXへ戻る',exact=True).click();page.wait_for_function("()=>!document.querySelector('iframe.silver-game')&&window.__retroAudio.state==='closed'",timeout=10000)
  assert not errors,errors
  rows.append({'width':w,'height':h,'settingsDoesNotMoveGame':True,'settingsFitsViewport':True,'rapidStrengthClicks':44,'launchBalance':49800,'pauseResume':True,'errors':errors});print('passed',w,h,flush=True);page.close()
 b.close()
(out/'browser-results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
