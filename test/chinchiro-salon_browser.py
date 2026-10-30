"""User-visible salon checks; physical seeds feed the real Match, never forced production results."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3483');ap.add_argument('--output',default='docs/chinchiro/salon/browser');a=ap.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for w in [375,390,414,1440]:
  page=b.new_page(viewport={'width':w,'height':900},has_touch=w<500);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(a.url+'/chinchiro/index.html?inspect=1');page.wait_for_function('()=>window.chinchiro?.tray');page.wait_for_timeout(600)
  assert page.evaluate('chinchiro.tray.preview.children.length===3&&chinchiro.tray.world===null')
  assert page.locator('#round-progress .current').inner_text()=='1'
  for value in [10,25,50,100]:
   page.click(f'[data-bet="{value}"]');assert page.locator('#stake-total').inner_text()==f'{value} 枚'
   assert page.locator('#stake-coins img').count()>0
  page.locator('#bet').evaluate("e=>{e.value=77;e.dispatchEvent(new Event('input',{bubbles:true}))}")
  assert page.locator('#stake-total').inner_text()=='77 枚'
  vals=page.locator('#stake-coins img').evaluate_all("els=>els.map(e=>parseInt(e.alt))");assert sum(vals)==77
  # Action follows the stake in normal flow: it must not cover bet controls on mobile.
  assert page.locator('#action').bounding_box()['y']>=page.locator('#risk').bounding_box()['y']
  assert page.locator('[data-bet="25"]').bounding_box()['height']>=44
  page.screenshot(path=str(out/f'bet-{w}.png'),full_page=True)
  page.click('#action');assert page.locator('#showdown').is_visible();assert page.locator('.showdown-side').count()==2
  page.click('#action');page.wait_for_function('()=>chinchiro.busy&&chinchiro.tray.world');
  if w<500:
   r=page.locator('#dice-board').bounding_box();assert r['y']>=0 and r['y']+r['height']<=900
  assert not page.evaluate('chinchiro.tray.preview.visible')
  page.click('#pause');page.wait_for_timeout(100);tick=page.evaluate('chinchiro.tray.world.tick');page.wait_for_timeout(150);assert page.evaluate('chinchiro.tray.world.tick')==tick
  page.click('#rules-open');page.keyboard.press('Escape');assert page.locator('#pause').inner_text()=='再開';page.click('#pause');page.wait_for_function('()=>!chinchiro.busy',timeout=45000)
  result=page.evaluate('chinchiro.tray.lastResult');assert page.locator('.showdown-role').first.inner_text()!='投擲中'
  # Deterministic rule outcomes exercise the actual public UI renderer, after real throw has completed.
  # Reset via UI, then inject valid physical-face results into Match's normal API.
  page.locator('.sound-settings > summary').click();page.click('#restart');page.click('#confirm-restart');assert page.locator('#stake-total').inner_text()=='77 枚'
  page.click('[data-bet="25"]');page.click('#action')
  page.evaluate("()=>{const m=chinchiro.match;m.roll([1,1,1]);m.advance();m.roll([2,2,6]);m.advance();document.querySelector('#bet').dispatchEvent(new Event('input',{bubbles:true}));}")
  assert page.locator('.showdown-role').first.inner_text()=='ピンゾロ'
  assert page.locator('.showdown-side').first.locator('.score-die').count()==3
  assert page.locator('#role').inner_text()=='あなたの勝ち'
  assert page.locator('.bank').all_inner_texts()==['1,125 枚','875 枚']
  assert page.locator('#history .history-hand').count()==1;assert page.locator('#history .history-delta').inner_text()=='+125 枚'
  assert page.locator('#result-fx').get_attribute('data-tone')=='win'
  page.screenshot(path=str(out/f'win-{w}.png'),full_page=True)
  page.click('#action');assert page.locator('#round-progress .complete').count()==1
  assert not page.locator('#result-fx').evaluate("e=>e.classList.contains('playing')")
  page.click('#restart');page.click('#confirm-restart');assert page.locator('#history .history-hand').count()==0
  if w==390:
   for faces,expected,tone in [([1,2,3],-50,'loss'),([2,2,6],0,'tie')]:
    page.click('[data-bet="25"]');page.click('#action')
    page.evaluate("faces=>{const m=chinchiro.match;m.roll(faces);m.advance();m.roll([2,2,6]);m.advance();document.querySelector('#bet').dispatchEvent(new Event('input',{bubbles:true}));}",faces)
    assert page.locator('#result-fx').get_attribute('data-tone')==tone
    assert page.locator('.bank').first.inner_text()==f'{1000+expected:,} 枚'
    if tone=='tie':assert page.locator('#result-fx img').count()==0
    page.click('#restart');page.click('#confirm-restart')
  page.locator('.quick-guide > summary').click();assert page.locator('.role-grid > div').count()==6
  page.click('#motion');assert page.evaluate('chinchiro.tray.reduced');page.click('#motion')
  page.click('#sound');page.wait_for_function('()=>chinchiro.tray.sound.enabled');page.click('#sound');assert not page.evaluate('chinchiro.tray.sound.enabled')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert errors==[],errors
  rows.append({'width':w,'checks':['idle physical meshes','coin amounts10/25/50/100/77','no action overlap','44px coin controls','live throw','pause','dialog cancel preserves pause','two-sided roles','exact125 settlement','round markers','reset clears effects','loss and tie classification390','role guide','sound gesture','reduced motion','no overflow'],'errors':errors,'realThrow':result});page.close()
 b.close()
(out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
