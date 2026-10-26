import json,subprocess,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_FINAL_QA_DIR','docs/qa/retro-final-hole'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 rows=[]
 for version,width in [('before',390),('after',375),('after',390),('after',414)]:
  page=b.new_page(viewport={'width':width,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if version=='before':
   for name in ['scene.js','physics.js','fx.js']:
    content=subprocess.check_output(['git','show','cc367a1:public/silver-ring/src/'+name])
    page.route('**/silver-ring/src/'+name,lambda route,request,body=content:route.fulfill(body=body,content_type='text/javascript'))
  page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/silver-ring/index.html?debug=1&seed=final-hole-qa')
  page.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000)
  page.wait_for_function('()=>window.SILVER_GAME?.refs.bowlRefs.length===3',timeout=90000)
  data=page.evaluate('''async()=>{
    const g=SILVER_GAME,{CFG}=await import('/silver-ring/src/config.js');
    g.S.phase='paused';g.S.auto=false;g.S.freeCam=false;g.refs.controls.enabled=false;
    g.sim.balls.length=0;g.sim.spawnInBowl(2);const ball=g.sim.balls[0],bw=CFG.bowls.list[2],h=bw.holes.find(x=>x.win),hx=Math.cos(h.a)*bw.ringR,hz=Math.sin(h.a)*bw.ringR;
    Object.assign(ball,{px:hx+.018,pz:hz,holeTime:.046});
    const start=g.sim.worldPos(ball,[0,0,0]);g.sim.sink(ball,bw,bw.holes.indexOf(h),hx,hz);
    const path=[];for(let i=0;i<60;i++){g.sim.stepScript(ball,1/240);path.push(g.sim.worldPos(ball,[0,0,0]));}
    g.fx.detailView=true;g.fx.detailPose={pitch:50,yaw:10,zoom:1};g.fx.setCamMode('CRUUNE',2);
    for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false});
    const pos=g.sim.worldPos(ball,[0,0,0]),matrix=new g.refs.THREE.Matrix4().makeTranslation(...pos);
    g.refs.ballsIM.count=1;g.refs.ballsIM.setMatrixAt(0,matrix);g.refs.ballsIM.instanceMatrix.needsUpdate=true;
    g.refs.renderer.setRenderTarget(null);g.refs.renderer.render(g.refs.scene,g.refs.camera);
    const ring=g.refs.bowlRefs[2].holes.find(x=>x.win).ring;
    return {start,path,rainbow:!!ring.userData.rainbow,colors:ring.geometry.attributes.color?.count||0,scale:ring.scale.toArray(),script:ball.mode};
  }''')
  if version=='after':assert data['rainbow'] and data['colors']>100 and data['scale']==[1,1,1]
  page.screenshot(path=str(out/f'{version}-{width}.png'));assert not errors,errors
  rows.append({'version':version,'width':width,'errors':errors,**data});page.close()
 (out/'browser.json').write_text(json.dumps(rows,indent=2));print('before/after capture and 3 widths passed');b.close()
