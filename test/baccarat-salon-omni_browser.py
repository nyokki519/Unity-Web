"""Actual card-boundary pointer/touch acceptance; no financial outcome overrides."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('UNITY_URL','http://127.0.0.1:3483').rstrip('/')
OUT=Path('.superpowers/sdd/baccarat-omni-casino');OUT.mkdir(parents=True,exist_ok=True)
DIRECTIONS={'top':(.5,.04),'bottom':(.5,.96),'left':(.04,.5),'right':(.96,.5),'top-left':(.04,.04),'top-right':(.96,.04),'bottom-left':(.04,.96),'bottom-right':(.96,.96)}
results=[]
def state(p):return p.evaluate('() => structuredClone(SALON.controller.session.state)')
def open_view(p,reduced=True):
 p.evaluate('(reduced)=>{const token=window.omniToken=(window.omniToken||0)+1;window.omniResult=null;window.omniPromise=SALON.squeeze.open({card:7,label:"Independent directional QA",reduced});omniPromise.then(value=>{if(window.omniToken===token)window.omniResult=value})}',reduced)
 expect(p.locator('[data-squeeze=finish]')).to_be_visible();p.locator('.salon-squeeze__stage').scroll_into_view_if_needed()
 if not reduced:p.wait_for_timeout(200)
def rect(p):return p.evaluate('() => {const r=SALON.squeeze.getCardRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}')
def points(p,direction):
 r=rect(p);u,v=DIRECTIONS[direction];x,y=r['x']+u*r['width'],r['y']+v*r['height'];dx=(.5-u)*r['width']*.72;dy=(.5-v)*r['height']*.72
 return (x,y),(x+dx,y+dy),(x+dx*.12,y+dy*.12)
def progress(p):return p.evaluate('()=>SALON.squeeze.progress')
def mouse_case(p,direction):
 a,b,c=points(p,direction);p.mouse.move(*a);p.mouse.down();p.mouse.move(*b,steps=8)
 high=progress(p);assert high>.1,(direction,high);assert p.locator('#salon-squeeze').get_attribute('data-direction')==direction
 if p.evaluate('()=>!!SALON.squeeze.graphics'):p.screenshot(path=str(OUT/f'curl-{direction}.png'),full_page=True)
 p.mouse.move(*c,steps=8);low=progress(p);assert low<high*.5,(direction,high,low)
 p.mouse.up();assert p.evaluate('()=>!!SALON.squeeze.resolve');return high
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/baccarat/index.html');page.locator('[data-action=start]:visible').click();page.wait_for_function('()=>SALON.controller.session?.state.phase==="betting"');original=state(page)
 for direction in DIRECTIONS:
  open_view(page,False);high=mouse_case(page,direction);assert state(page)==original
  results.append('mouse '+direction+' opens and reverse drag closes without accounting change');print('PASS',results[-1],flush=True)
 # A partial release allows a new grip on another edge.
 open_view(page);mouse_case(page,'left');mouse_case(page,'top-right');assert state(page)==original
 results.append('regrip another edge after partial release')
 # Pointer cancel is an actual input cancellation; it cannot settle or reveal.
 open_view(page);a,b,_=points(page,'bottom');page.mouse.move(*a);page.mouse.down();page.mouse.move(*b,steps=7)
 page.locator('.salon-squeeze__hit').evaluate('(el)=>el.dispatchEvent(new PointerEvent("pointercancel",{pointerId:1,bubbles:true}))');page.mouse.up()
 assert page.evaluate('()=>!SALON.squeeze.pointer && window.omniResult===null');assert state(page)==original
 results.append('pointercancel clears grip without revealing')
 # Outside the projected card, even a tap in the surrounding stage is inert.
 open_view(page);r=rect(page);stage=page.locator('.salon-squeeze__stage').bounding_box();x=stage['x']+2;y=stage['y']+2
 assert not(r['x']<=x<=r['x']+r['width'] and r['y']<=y<=r['y']+r['height'])
 page.mouse.click(x,y);assert page.evaluate('()=>window.omniResult===null');assert progress(page)==0
 page.screenshot(path=str(OUT/'outside-card-no-reveal.png'),full_page=True);results.append('outside-card stage tap does not reveal')
 cdp=ctx.new_cdp_session(page)
 def touch(kind,point=None):
  args={'type':kind,'touchPoints':[] if point is None else [{'x':point[0],'y':point[1],'radiusX':2,'radiusY':2,'force':1,'id':1}]};cdp.send('Input.dispatchTouchEvent',args);page.wait_for_timeout(80)
 for direction in DIRECTIONS:
  open_view(page);a,b,c=points(page,direction);touch('touchStart',a);touch('touchMove',b);high=progress(page)
  assert high>.1,(direction,'touch',high);assert page.locator('#salon-squeeze').get_attribute('data-direction')==direction
  touch('touchMove',c);assert progress(page)<high*.5;touch('touchEnd');assert page.evaluate('()=>window.omniResult===null');assert state(page)==original
  results.append('touch '+direction+' opens and unwinds');print('PASS',results[-1],flush=True)
 # Pointer tap and keyboard still complete only the viewer promise.
 open_view(page);r=rect(page);page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.wait_for_function('()=>window.omniResult===true');assert state(page)==original
 open_view(page);page.locator('.salon-squeeze__stage').focus();page.keyboard.press('Enter');page.wait_for_function('()=>window.omniResult===true');assert state(page)==original
 results.append('card tap and keyboard preserve viewer completion contract')
 # Actual application round: finances reserve once and remain frozen while peeking.
 page.locator('[data-action="bet:banker"]:visible').click();page.locator('[data-action="chip:1"]:visible').click()
 page.locator('[data-action=confirm]:visible').click();expect(page.locator('[data-squeeze=finish]')).to_be_visible(timeout=15000)
 reserved=state(page);mouse_case(page,'bottom-right');assert state(page)==reserved
 page.locator('#salon-squeeze [data-action=skip]').click();page.wait_for_function('()=>SALON.controller.session.state.phase==="result"')
 final=state(page);assert len(final['history'])==1 and final['stats']['rounds']==1 and final['round']['paid']
 assert final['balance']==final['round']['balanceBefore']+final['round']['receipt']['net']
 page.screenshot(path=str(OUT/'round-end.png'),full_page=True);results.append('real round peeking keeps reserved finances frozen; skip settles once')
 page.locator('[data-action=next]:visible').click()
 for width in [375,390,414]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  small=page.locator('button:visible').evaluate_all('els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(e=>e.dataset.action)');assert not small,(width,small)
  page.screenshot(path=str(OUT/f'casino-{width}.png'),full_page=True)
 results.append('375 390 414 casino layout has no overflow and 44px controls')
 assert not errors,errors;browser.close()
(OUT/'qa-report.md').write_text('# Omni squeeze independent browser QA\n\nCommand: `python test/baccarat-salon-omni_browser.py`\n\nURL: '+BASE+'\n\n'+ '\n'.join('- PASS '+r for r in results)+'\n\nScreenshots: '+', '.join(str(p) for p in OUT.glob('*.png'))+'\n')
print(f'{len(results)} omni checks passed')
