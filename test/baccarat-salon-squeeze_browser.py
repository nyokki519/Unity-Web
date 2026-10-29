from playwright.sync_api import sync_playwright
import os
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 page.goto(base+'/baccarat/classic.html')
 page.evaluate("document.body.innerHTML=''; document.head.insertAdjacentHTML('beforeend','<link rel=stylesheet href=/baccarat/salon-squeeze.css>')")
 result=page.evaluate('''async () => {
  const {createCard}=await import('/baccarat/salon-card.js');
  const {SqueezeView}=await import('/baccarat/salon-squeeze.js');
  const host=document.createElement('section'); document.body.append(host);
  const card=createCard(0); const back=createCard(0,{hidden:true});
  let reveals=0; const view=new SqueezeView(host,{onReveal:()=>reveals++});
  const first=view.open({card:0,label:'Player'}); view.cancel(); const cancelled=await first;
  const second=view.open({card:1,label:'Banker',reduced:true}); view.finish(); view.finish(); const completed=await second;
  view.dispose(); return {card:card.getAttribute('aria-label'),back:back.getAttribute('aria-label'),cancelled,completed,reveals,empty:host.childElementCount};
 }''')
 assert result['card'] and result['back'] and result['card'] != result['back'],result
 assert result['cancelled'] is False and result['completed'] is True and result['reveals']==1 and result['empty']==0,result
 page.evaluate("""async () => { const {SqueezeView}=await import('/baccarat/salon-squeeze.js'); const host=document.createElement('section'); host.id='squeeze-test'; document.body.append(host); window.progress=[]; window.view=new SqueezeView(host,{onProgress:p=>progress.push(p)}); window.pending=view.open({card:26,label:'Player'}); }""")
 page.wait_for_selector('.salon-squeeze__canvas',timeout=10000)
 assert page.evaluate('view.graphics.frontTexture.image.width >= 512 && view.graphics.frontTexture.image.height >= 710')
 assert page.evaluate("document.querySelector('#squeeze-test .salon-card').getAttribute('aria-label').includes('ダイヤ')")
 stage=page.locator('#squeeze-test .salon-squeeze__stage'); box=stage.bounding_box()
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']*.8); page.mouse.down(); page.mouse.move(box['x']+box['width']/2,box['y']+box['height']*.4,steps=6); page.mouse.up()
 assert page.evaluate('progress.some(p=>p>0 && p<1)')
 page.locator('#squeeze-test button').click(); assert page.evaluate('pending') is True
 page.evaluate("""() => { const original=window.originalGetContext=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...rest){if(type.startsWith('webgl')) return null; return original.call(this,type,...rest)}; window.pending=view.open({card:1,label:'Banker'}); }""")
 page.wait_for_timeout(500); assert page.locator('#squeeze-test .salon-squeeze__fallback').is_visible()
 page.locator('#squeeze-test .salon-squeeze__stage').focus(); page.keyboard.press('Enter'); assert page.evaluate('pending') is True
 page.evaluate("""() => { HTMLCanvasElement.prototype.getContext=window.originalGetContext; }""")
 # Reopen ten cards and wait for each renderer before closing it.
 for card in range(10):
  page.evaluate("card => { window.pending=view.open({card,label:'Player'}); }",card)
  page.wait_for_selector('#squeeze-test .salon-squeeze__canvas',timeout=10000)
  page.evaluate('view.cancel()')
  assert page.evaluate('pending') is False
 b.close(); print('salon squeeze lifecycle, drag, keyboard, fallback and ten reopenings passed')
