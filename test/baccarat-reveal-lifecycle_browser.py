"""A queued or in-flight decorative flip cannot overrule skip/pause's exposed cards."""
import os,time
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
def until(page,predicate,seconds=10):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if page.evaluate(predicate):return
  page.wait_for_timeout(25)
 raise AssertionError(predicate)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.goto(base+'/baccarat/index.html');page.locator('[data-action=tutorial]').click();page.locator('[data-action="bet:player"]').click();page.evaluate('()=>{window.heldFrames=[];window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=fn=>{heldFrames.push(fn);return heldFrames.length}}');page.locator('[data-action=confirm]').click();until(page,'()=>BACCARAT.session.state.round.revealed===1');page.locator('[data-action=skip]').click();page.evaluate('()=>{requestAnimationFrame=nativeRAF;const q=heldFrames.splice(0);for(const fn of q)fn(performance.now())}');page.wait_for_timeout(60);assert page.locator('.card-inner').evaluate_all('(nodes)=>nodes.every(n=>n.getAnimations().length===0)'), 'queued flip restarted after paid result'
 page.locator('[data-action=next]').click();page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();until(page,'()=>BACCARAT.session.state.round.revealed===2');page.keyboard.press('Escape');assert page.locator('[data-action=resume-deal]').is_visible();assert page.locator('.card-inner').evaluate_all('(nodes)=>nodes.every(n=>n.getAnimations().length===0)'), 'pause left an invisible face overriding exposed points';assert page.locator('.playing-card.revealed .card-inner').evaluate_all('(nodes)=>nodes.every(n=>getComputedStyle(n).transform.startsWith("matrix3d(-1"))');b.close()
print('queued flip skip and active flip pause lifecycle passed')
