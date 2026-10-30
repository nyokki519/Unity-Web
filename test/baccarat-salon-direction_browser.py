from playwright.sync_api import sync_playwright
import os, math
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 page.goto(base+'/baccarat/classic.html'); page.evaluate("document.body.innerHTML='';document.head.insertAdjacentHTML('beforeend','<link rel=stylesheet href=/baccarat/salon-squeeze.css>')")
 page.evaluate("""async()=>{let m=await import('/baccarat/salon-squeeze.js');let h=document.createElement('section');document.body.append(h);window.count=0;window.view=new m.SqueezeView(h,{onReveal:()=>count++});window.pending=view.open({card:0,label:'Player'});} """)
 page.wait_for_selector('.salon-squeeze__canvas')
 for x,y in [(0,-1),(0,1),(-1,0),(1,0),(-1,-1),(1,-1),(-1,1),(1,1)]:
  box=page.locator('.salon-squeeze__hit').bounding_box(); sx=box['x']+box['width']*(.5+.42*x); sy=box['y']+box['height']*(.5+.42*y)
  page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx-x*box['width']*.28,sy-y*box['height']*.28,steps=5)
  progress=page.evaluate('view.progress'); normal=page.evaluate('view.normal');
  if x==1 and y==-1: page.screenshot(path='/tmp/salon-omni-corner.png')
  assert progress>.05,(x,y,progress); assert math.copysign(1,normal['x'])==math.copysign(1,x) if x else normal['x']==0; assert math.copysign(1,normal['y'])==math.copysign(1,-y) if y else normal['y']==0
  page.mouse.move(sx,sy,steps=5);assert page.evaluate('view.progress')<.01;page.mouse.up();assert page.evaluate('count')==0
 page.screenshot(path='/tmp/salon-omni-directions.png')
 page.evaluate("""()=>{const hit=view.hit; const r=hit.getBoundingClientRect(); hit.dispatchEvent(new PointerEvent('pointerdown',{pointerId:99,button:0,clientX:r.left+2,clientY:r.top+r.height/2,bubbles:true})); hit.dispatchEvent(new PointerEvent('pointercancel',{pointerId:99,bubbles:true}));}""")
 assert page.evaluate('view.pointer===null && count===0');page.evaluate('view.cancel()');assert page.evaluate('pending') is False
 b.close();print('eight directional gestures, unwind and cancellation passed')
