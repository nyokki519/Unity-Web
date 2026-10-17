from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');page.goto('http://127.0.0.1:3461/');page.set_content('<link rel="stylesheet" href="/silver-ring/presentation.css"><body class="reduced"></body>');page.evaluate("async()=>{const m=await import('/silver-ring/src/banknote-rain.js');m.createBanknoteRain()}");page.wait_for_function("()=>document.querySelector('.unity-coin')?.getAnimations().length>0")
 def state():return page.evaluate("()=>{const n=document.querySelector('.unity-coin');return{matrix:getComputedStyle(n).transform,time:n.getAnimations()[0].currentTime,opacity:getComputedStyle(document.querySelector('.unity-note')).opacity}}")
 before=state();page.wait_for_timeout(700);after=state();assert before['matrix']!=after['matrix'];assert after['opacity']=='1';page.evaluate("document.body.dataset.phase='paused'");page.wait_for_timeout(100);frozen=state();page.wait_for_timeout(300);assert abs(frozen['time']-state()['time'])<20
 Path('docs/qa/free-camera/coin-motion.json').write_text(json.dumps({'reducedMotionRotates':True,'pauseStopsRotation':True,'opacity':after['opacity']},indent=2));print('coin reduced rotation and pause passed');b.close()
