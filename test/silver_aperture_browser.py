import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SILVER_APERTURE_QA_DIR','docs/qa/retro-aperture'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 rows=[]
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844},has_touch=True,reduced_motion='no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('SILVER_URL','http://127.0.0.1:3482')+'/silver-ring/index.html?debug=1&rev=aperture1');page.locator('#btnStart').click(timeout=90000)
  c=page
  initial=c.evaluate('''async()=>{
   const g=SILVER_GAME,{CFG}=await import('/silver-ring/src/config.js'),{holeGeometry}=await import('/silver-ring/src/hole-geometry.js'),{winFunnelSpec}=await import('/silver-ring/src/physics.js');
   g.S.phase='paused';g.S.auto=false;g.sim.balls.length=0;g.sim.spawnInBowl(2);
   const bw=CFG.bowls.list[2],h=holeGeometry(bw,bw.holes.find(h=>h.win));
   const ball=g.sim.balls[0];Object.assign(ball,{px:h.x+.004,pz:h.z,pvx:0,pvz:0,hopY:0,hopV:0,holeTime:0});
   window.apertureEvents=[];const original=g.sim.emit;g.sim.emit=(type,data)=>{if(type==='sink'&&data.tier===2)apertureEvents.push(data);original(type,data);};
   g.fx.detailView=false;g.fx.setCamMode('CRUUNE',2);for(let i=0;i<180;i++)g.fx.update(1/60,g.sim,{tension:0,freeCam:false});
   const hole=g.refs.bowlRefs[2].holes.find(x=>x.win),disc=hole.hg.children.find(o=>o.geometry?.type==='CircleGeometry');
   let sleeve;g.refs.boardG.traverse(o=>{if(o.userData.finalWinSleeve)sleeve=o;});
   window.apertureQA={hole:h,top:winFunnelSpec(2).top,ball};
   window.renderAperturePose=()=>{const p=g.sim.worldPos(ball,[0,0,0]),m=new g.refs.THREE.Matrix4().makeTranslation(...p);g.refs.ballsIM.count=1;g.refs.ballsIM.setMatrixAt(0,m);g.refs.ballsIM.instanceMatrix.needsUpdate=true;g.refs.renderer.setRenderTarget(null);g.refs.renderer.render(g.refs.scene,g.refs.camera);return{position:p,mode:ball.mode,events:apertureEvents.length};};
   return{...renderAperturePose(),hole:h,discRadius:disc.geometry.parameters.radius,ringInner:hole.ring.geometry.parameters.radius-hole.ring.geometry.parameters.tube,displayCentre:hole.hg.position.toArray(),quaternion:hole.hg.quaternion.toArray(),sleeveRadius:sleeve.geometry.parameters.radiusTop};
  }''')
  assert abs(initial['discRadius']-initial['ringInner'])<1e-10
  assert initial['sleeveRadius']==initial['discRadius']==initial['hole']['aperture']
  assert initial['quaternion']==[0,0,0,1]
  assert abs(initial['displayCentre'][0]-initial['hole']['x'])<1e-12 and abs(initial['displayCentre'][2]-initial['hole']['z'])<1e-12
  page.screenshot(path=str(out/f'before-{width}.png'))
  entered=c.evaluate('''()=>{const s=SILVER_GAME.sim,b=apertureQA.ball;for(let i=0;i<100&&b.mode==='bowl';i++)s.step(1/240);const p=renderAperturePose();return{...p,offset:Math.hypot(b.px-apertureQA.hole.x,b.pz-apertureQA.hole.z)};}''')
  assert entered['mode']=='script' and entered['events']==0 and entered['offset']<initial['hole']['capture'],entered
  page.screenshot(path=str(out/f'enter-{width}.png'))
  passed=c.evaluate('''()=>{const s=SILVER_GAME.sim,b=apertureQA.ball;for(let i=0;i<120&&!apertureEvents.length;i++)s.stepScript(b,1/240);const p=renderAperturePose();return{...p,top:apertureQA.top,event:apertureEvents[0]};}''')
  assert passed['events']==1 and passed['position'][1]+.026<=passed['top'],passed
  page.screenshot(path=str(out/f'passed-{width}.png'))
  miss=c.evaluate('''()=>{const g=SILVER_GAME,h=apertureQA.hole;g.sim.balls.length=0;g.sim.spawnInBowl(2);const b=g.sim.balls[0];Object.assign(b,{px:h.x+.018,pz:h.z,pvx:0,pvz:0,hopY:0,hopV:0,holeTime:.05,holeIndex:0});const count=apertureEvents.length;g.sim.step(1/240);return{mode:b.mode,newEvents:apertureEvents.length-count,offset:Math.hypot(b.px-h.x,b.pz-h.z)};}''')
  assert miss['mode']=='bowl' and miss['newEvents']==0 and miss['offset']>initial['hole']['capture'],miss
  assert not errors,errors;rows.append({'width':width,'initial':initial,'entered':entered,'passed':passed,'miss':miss,'errors':errors});page.close()
 (out/'browser.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows));b.close()
