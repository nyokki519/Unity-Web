from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':900,'height':650})
 page.goto('http://127.0.0.1:3461/');page.set_content('<link rel="stylesheet" href="/silver-ring/presentation.css"><style>body{background:#14211b;color:#ffe8a5}#unity-banknote-background{overflow:visible}.unity-note{--coin-size:150px!important;width:150px;height:150px}</style>')
 page.evaluate("async()=>{const m=await import('/silver-ring/src/banknote-rain.js');m.createBanknoteRain()}")
 page.wait_for_function("()=>document.getElementById('unity-banknote-background').dataset.icon==='ready'")
 page.evaluate("""()=>{document.getAnimations().forEach(a=>a.cancel());[...document.querySelectorAll('.unity-note')].forEach((n,i)=>{n.style.cssText+=';animation:none!important;top:'+ (80+Math.floor(i/5)*180)+'px;left:'+(30+i%5*175)+'px;right:auto';let c=n.querySelector('.unity-coin');c.style.cssText+=';animation:none!important;transform:rotateX(22deg) rotateY('+(i%5*45)+'deg)';n.querySelector('.coin-flight').style.cssText+=';animation:none!important';})}""")
 page.screenshot(path='docs/qa/solid-coins/angles.png');b.close()
