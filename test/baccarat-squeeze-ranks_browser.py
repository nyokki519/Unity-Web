"""Actual DOM/WebGL rank-hiding checks, including pre-decode and reduced fallbacks."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');out=Path(os.environ.get('RANK_QA_OUT','docs/baccarat/squeeze-ranks'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>window.SALON?.ready');page.evaluate("document.body.innerHTML='';document.head.insertAdjacentHTML('beforeend','<link rel=stylesheet href=/baccarat/salon-squeeze.css>')")
 page.evaluate('''async()=>{const {SqueezeView}=await import('/baccarat/salon-squeeze.js');const h=document.createElement('section');document.body.append(h);window.v=new SqueezeView(h);window.p=v.open({card:9,reduced:true});window.syncGuard={masks:v.face.querySelectorAll('.salon-rank-mask').length,label:v.face.getAttribute('aria-label')};}''')
 assert page.evaluate('syncGuard.masks')==2;assert '絞り中' in page.evaluate('syncGuard.label')
 page.wait_for_function('()=>v.face.style.backgroundImage.includes("data:image/svg")')
 result=page.evaluate('''async()=>{
 const {FACES}=await import('/baccarat/card-data.js'),{classicCardFace,squeezeCardFace}=await import('/baccarat/classic-card.js'),{createCard}=await import('/baccarat/salon-card.js');
 const decode=async svg=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await im.decode();const c=document.createElement('canvas');c.width=720;c.height=1000;const x=c.getContext('2d');x.drawImage(im,0,0,720,1000);return x.getImageData(0,0,720,1000).data};
 const a=await decode(classicCardFace(FACES[9])),b=await decode(squeezeCardFace(FACES[9]));let cornerDiff=0,centerDiff=0;
 for(let y=0;y<1000;y++)for(let x=0;x<720;x++){const i=(y*720+x)*4,changed=[0,1,2,3].some(k=>a[i+k]!==b[i+k]);if(changed){if((x<220&&y<160)||(x>500&&y>840))cornerDiff++;else centerDiff++;}}
 const uri=v.face.style.backgroundImage;return {cornerDiff,centerDiff,normalRankStillPresent:createCard(9).getAttribute('aria-label').includes('10'),fallbackRankFree:!decodeURIComponent(uri).includes('<text'),fallbackCornerMasks:v.face.querySelectorAll('.salon-rank-mask').length};
 }''')
 assert result['cornerDiff']>100 and result['centerDiff']==0,result
 assert result['normalRankStillPresent'] and result['fallbackRankFree'] and result['fallbackCornerMasks']==2
 page.evaluate('v.setProgress(.72)');page.screenshot(path=str(out/'fallback-no-number.png'));page.evaluate('()=>{v.cancel();window.p=v.open({card:9});}');page.wait_for_function('()=>!!v.graphics')
 texture=page.evaluate('''async()=>{const {FACES}=await import('/baccarat/card-data.js'),{squeezeCardFace}=await import('/baccarat/classic-card.js');const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(squeezeCardFace(FACES[9]));await image.decode();const c=document.createElement('canvas');c.width=720;c.height=1000;const x=c.getContext('2d');x.drawImage(image,0,0,720,1000);const a=x.getImageData(0,0,720,1000).data,b=v.graphics.frontTexture.image.getContext('2d').getImageData(0,0,720,1000).data;return {same:a.every((n,i)=>n===b[i]),size:[c.width,c.height]};}''');assert texture['same'],texture
 page.evaluate('v.setProgress(.72)');page.screenshot(path=str(out/'webgl-no-number.png'));page.locator('[data-squeeze=finish]').click();assert page.evaluate('p') is True
 # A fresh normal card after completed reveal retains its original rank label and atlas.
 normal=page.evaluate('''async()=>{const {createCard}=await import('/baccarat/salon-card.js');const e=createCard(9);document.body.append(e);return{label:e.getAttribute('aria-label'),masks:e.querySelectorAll('.salon-rank-mask').length,atlas:e.style.backgroundImage.includes('classic-cards.png')};}''');assert '10' in normal['label'] and normal['masks']==0 and normal['atlas']
 assert errors==[],errors;report={**result,'webglTexture':texture,'normalAfterReveal':normal,'errors':errors};(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));b.close()
