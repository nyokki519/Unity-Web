"""Controlled DOM fixture tests cosmetic timing and cancellation in Chromium."""
import json,os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3487')+'/baccarat/motion.js')
 result=page.evaluate('''async()=>{
 const m=await import('/baccarat/motion.js');document.body.innerHTML=`<style>.card-inner{display:block;transform:rotateY(180deg)}.playing-card{width:80px;height:112px;transform:rotate(90deg)}</style><div class="felt" data-winner="player"><section class="hand player"><b class="points">7</b><button class="playing-card"><span class="card-inner"><span class="card-front">7♠</span></span></button></section></div><div id="outcome">PLAYER</div><div id="receipt"></div>`;
 const node=document.querySelector('.playing-card');let calls=0;const start=performance.now();let time=0,transform='';m.dealMotion(node,{speed:'normal'},()=>{calls++;time=performance.now()-start;transform=getComputedStyle(node.querySelector('.card-inner')).transform;});await new Promise(r=>setTimeout(r,550));
 if(calls!==1||time<200||time>550)throw Error('front timing '+time);const mat=new DOMMatrix(transform);if(mat.m11>0)throw Error('front callback while back facing');
 m.dealMotion(node,{speed:'quick'},()=>calls++);m.clearMotion();await new Promise(r=>setTimeout(r,220));if(calls!==1)throw Error('stale face callback');
 m.settleMotion({net:100000,lines:[]},{speed:'normal',particles:true,flash:true});await new Promise(r=>setTimeout(r,380));const peak=document.querySelectorAll('.ceremony-spark,.ceremony-reflection,.flying-chip').length;if(peak>24)throw Error('decorative cap');if(!document.querySelector('.hand').classList.contains('ceremony-winner'))throw Error('winner not accented');m.clearMotion();if(document.querySelectorAll('.ceremony-spark,.ceremony-reflection,.ceremony-winner,.settlement-light').length)throw Error('cleanup');return {faceCallbackMs:Math.round(time),peak,cancellation:true};
 }''')
 print(json.dumps(result));b.close()
