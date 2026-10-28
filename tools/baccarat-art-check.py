from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageStat
import json,os
from pathlib import Path
out=Path(os.environ.get('BACCARAT_QA_DIR','/tmp/baccarat-qa'));out.mkdir(exist_ok=True)
base=os.environ.get('UNITY_URL','http://127.0.0.1:3482')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':500,'height':700},device_scale_factor=1)
 page.goto(base+'/baccarat/cards/back.svg');page.screenshot(path=str(out/'back-500.png'))
 original=Image.open(out/'back-500.png').convert('RGB');diff=ImageChops.difference(original,original.transpose(Image.Transpose.ROTATE_180));stats=ImageStat.Stat(diff);mean=sum(stats.mean)/3;assert mean<1,mean
 page.set_viewport_size({'width':1600,'height':1300});page.goto(base+'/baccarat/index.html');page.evaluate("()=>{document.body.style='margin:0;background:#182722;color:#eee';document.body.innerHTML='<h1 style=\"font:24px sans-serif;margin:20px\">VESPER / 52 ORIGINAL CARDS</h1><div id=\"sheet\" style=\"display:grid;grid-template-columns:repeat(13,1fr);gap:12px;padding:20px\"></div>';for(let i=0;i<52;i++){const img=document.createElement('img');img.src='/baccarat/cards/'+i+'.svg';img.style='width:100%;height:auto';document.querySelector('#sheet').append(img)}}")
 page.wait_for_function('()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)');page.screenshot(path=str(out/'cards-52.png'),full_page=True)
 (out/'art.json').write_text(json.dumps({'faces':52,'backRotationMeanRGBDifference':mean,'rotationTestThreshold':1,'fontFilesBundled':0},indent=2));print('back symmetry mean RGB difference',mean);b.close()
