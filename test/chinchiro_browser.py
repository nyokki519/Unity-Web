import json,argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:3465');ap.add_argument('--output',default='docs/qa/chinchiro');args=ap.parse_args();base=args.url.rstrip('/');
out=Path(args.output);out.mkdir(parents=True,exist_ok=True);rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,414,1280]:
  page=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/chinchiro/index.html');page.wait_for_selector('.player');
  assert page.locator('.player').count()==2
  page.screenshot(path=str(out/f'start-{width}.png'),full_page=True)
  # Hidden-page pause must also recover before the first wager.
  page.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden")
  assert page.locator('#action').is_disabled();page.click('#pause');assert page.locator('#action').is_enabled()
  page.click('#rules-open');assert page.get_by_role('dialog',name='この卓のルール').count()==1;page.keyboard.press('Escape');assert not page.locator('#rules').evaluate('(e)=>e.open')
  for _ in range(90):
   label=page.locator('#action').inner_text()
   if label=='もう一度対戦する':break
   if page.locator('#action').is_enabled():page.click('#action')
   else:page.wait_for_timeout(160)
  assert page.locator('#action').inner_text()=='もう一度対戦する'
  assert 1<=page.locator('#history li').count()<=4
  coins=page.locator('.bank').all_inner_texts();assert sum(int(s.replace(',','').split()[0]) for s in coins)==2000
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=str(out/f'final-{width}.png'),full_page=True)
  page.click('#action');assert page.locator('.bank').all_inner_texts()==['1,000 枚','1,000 枚']
  page.click('#restart');assert page.get_by_role('dialog',name='最初から遊びますか？').count()==1;page.click('#cancel');assert page.locator('#action').is_enabled()
  page.goto(base+'/');page.wait_for_selector('a[href="/chinchiro/index.html"]');assert page.locator('a[href*="mechanical"]').count()==0
  response=page.goto(base+'/mechanical/index.html');assert response.status==410
  assert errors==[],errors;rows.append({'width':width,'errors':errors,'checks':['CPU match to final','ledger','retry','hidden-page resume before bet','rules Escape','restart cancel','no overflow','home link','retired URL 410']});page.close()
 b.close()
(out/'browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(json.dumps(rows,ensure_ascii=False))
