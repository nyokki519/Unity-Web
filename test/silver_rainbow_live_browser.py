"""Observe rainbow pixels through the normal shell and RAF, without calling FX.update."""
import os,json
from PIL import Image,ImageChops
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_FINAL_QA_DIR','docs/qa/retro-rainbow-live'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 rows=[]
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844},reduced_motion='no-preference',has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/?bonus=jackpot&debug=1')
  frame=page.frame_locator('iframe.silver-game');frame.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000)
  c=page.frames[1];c.wait_for_function('()=>window.SILVER_GAME?.refs.bowlRefs.length===3')
  info=c.evaluate('''()=>{
   const g=SILVER_GAME,ring=g.refs.bowlRefs[2].holes.find(x=>x.win).ring;
   g.S.freeCam=true;g.S.auto=false;g.sim.balls.length=0;g.refs.controls.enabled=false;g.refs.controls.enableDamping=false;
   g.refs.boardG.updateMatrixWorld(true);const target=ring.getWorldPosition(new g.refs.THREE.Vector3());
   g.refs.controls.target.copy(target);g.refs.camera.position.copy(target).add(new g.refs.THREE.Vector3(0,.42,.65));g.refs.camera.lookAt(target);
   const sleeves=[];g.refs.boardG.traverse(o=>{if(o.userData.finalWinSleeve)sleeves.push({color:o.material.color.getHex(),metalness:o.material.metalness});});
   return{url:location.href,sleeves,thickness:ring.geometry.parameters.tube};
  }''')
  assert info['sleeves']==[{'color':0x050b09,'metalness':0}];assert info['thickness']==.0045
  page.wait_for_timeout(350)
  def sample():return c.evaluate('''()=>{const r=SILVER_GAME.refs.bowlRefs[2].holes.find(x=>x.win).ring;return{phase:r.userData.rainbowPhase,colors:Array.from(r.geometry.attributes.color.array),position:r.position.toArray(),rotation:r.rotation.toArray()};}''')
  first=sample();bounds=c.evaluate('''()=>{const g=SILVER_GAME,r=g.refs.bowlRefs[2].holes.find(x=>x.win).ring,v=new g.refs.THREE.Vector3(),box=g.refs.renderer.domElement.getBoundingClientRect(),xs=[],ys=[];r.updateWorldMatrix(true,false);const p=r.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(r.matrixWorld).project(g.refs.camera);xs.push(box.left+(v.x+1)*box.width/2);ys.push(box.top+(1-v.y)*box.height/2);}return{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};}''');frameBox=page.locator('iframe.silver-game').bounding_box();page.screenshot(path=str(out/f'flow-a-{width}.png'));page.wait_for_timeout(850);second=sample();page.screenshot(path=str(out/f'flow-b-{width}.png'))
  crop=(int(bounds['left']+frameBox['x']),int(bounds['top']+frameBox['y']),int(bounds['right']+frameBox['x'])+1,int(bounds['bottom']+frameBox['y'])+1)
  imageA=Image.open(out/f'flow-a-{width}.png').convert('RGB').crop(crop);imageB=Image.open(out/f'flow-b-{width}.png').convert('RGB').crop(crop)
  changes=sum(1 for pixel in ImageChops.difference(imageA,imageB).getdata() if max(pixel)>8)
  assert changes>10,changes
  imageA.resize((imageA.width*6,imageA.height*6)).save(out/f'rim-a-{width}.png');imageB.resize((imageB.width*6,imageB.height*6)).save(out/f'rim-b-{width}.png')
  assert first['colors']!=second['colors'];assert first['position']==second['position'];assert first['rotation']==second['rotation']
  c.evaluate("()=>{document.body.classList.add('reduced');SILVER_GAME.S.reduce=true;}");page.wait_for_timeout(100);still=sample();page.wait_for_timeout(400);assert sample()['colors']==still['colors']
  assert not errors,errors
  rows.append({'width':width,**info,'phaseA':first['phase'],'phaseB':second['phase'],'changedRimPixels':changes,'colorsChanged':True,'reducedStopsColors':True,'geometryStationary':True,'errors':errors});page.close()
 (out/'browser.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows));b.close()
