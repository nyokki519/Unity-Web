"""Regression proofs for fresh reviewer findings at each committed rebet boundary."""
import os
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
 for nth,choice in ([] if os.environ.get('CLASSIC_MISSING_VENDOR_ONLY') else [(1,'はい'),(2,'はい'),(3,'はい'),(1,'いいえ')]):
  page=b.new_page(viewport={'width':800,'height':1300},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/baccarat/index.html');page.locator('[data-classic=start]').click();page.locator('[data-classic="bet:player"]').click();page.locator('[data-classic="chip:100"]').click();page.locator('[data-classic=deal]').click();expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible(timeout=8000)
  page.evaluate('''nth=>{const session=CLASSIC.controller.session;window.goodCommit=session.commit;let calls=0;session.commit=s=>++calls===nth?false:goodCommit(s)}''',nth);page.get_by_role('button',name=choice,exact=True).click();phase=page.evaluate('()=>CLASSIC.controller.session.state.phase');assert page.evaluate('()=>CLASSIC.controller.session.state.stats.rounds')==1
  if phase=='result':expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible(timeout=2000);page.get_by_role('button',name='いいえ',exact=True).click()
  else:expect(page.locator('[data-classic=deal]')).to_be_visible();expect(page.locator('[data-classic="chip:100"]')).to_be_enabled()
  page.evaluate('()=>CLASSIC.controller.session.commit=goodCommit');
  if not page.evaluate('()=>Object.keys(CLASSIC.controller.session.state.bets).length'):page.locator('[data-classic="bet:player"]').click();page.locator('[data-classic="chip:100"]').click()
  page.locator('[data-classic=deal]').click();expect(page.get_by_role('dialog',name='リベットを行いますか？')).to_be_visible();assert page.evaluate('()=>CLASSIC.controller.session.state.stats.rounds')==2;page.close()
 page=b.new_page();page.route('**/reference/vendor/jquery-ui.js',lambda r:r.abort());page.goto(base+'/baccarat/index.html');expect(page.locator('#load-error')).to_be_visible(timeout=5000);expect(page.locator('[data-classic=start]')).not_to_be_visible();assert not errors,errors;b.close()
print('all four rebet SAVE boundaries recover, no double settlement, missing dialog library blocks entry')
