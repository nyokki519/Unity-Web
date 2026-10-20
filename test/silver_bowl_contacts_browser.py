from pathlib import Path
from playwright.sync_api import sync_playwright
import json
OUT=Path('docs/qa/retro-contacts');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:3461/?bonus=jackpot&debug=1&seed=contacts-qa');f=page.frame_locator('iframe.silver-game');f.get_by_role('button',name='チャレンジ開始',exact=True).click(timeout=90000);c=page.frames[1];c.wait_for_function('()=>window.SILVER_GAME?.refs.boardTex.userData.artwork==="ready"',timeout=90000)
 rows=[]
 for tier in range(3):
  result=c.evaluate('''async(tier)=>{
   const {CFG}=await import('/silver-ring/src/config.js'),{bowlY}=await import('/silver-ring/src/physics.js');const g=SILVER_GAME,s=g.sim;
   g.S.phase='paused';g.S.auto=false;g.S.manualCamera='cradle'+(tier+1);g.S.freeCam=false;g.refs.controls.enabled=false;
   s.balls.length=0;s.spawnInBowl(tier);const ball=s.balls[0],bw=CFG.bowls.list[tier],h=bw.holes[1],hx=Math.cos(h.a)*bw.ringR,hz=Math.sin(h.a)*bw.ringR;
   Object.assign(ball,{px:hx+.028,pz:hz+.003,pvx:-.45,pvz:.18,hopY:0,hopV:0});
   const before={x:ball.pvx,z:ball.pvz},shakeBefore=g.fx.shakeAmp;for(let i=0;i<8;i++)s.step(1/240);const contactShake=g.fx.shakeAmp;
   g.fx.detailView=true;g.fx.detailPose={pitch:50,yaw:10,zoom:1};g.fx.setCamMode('CRUUNE',tier);for(let i=0;i<180;i++)g.fx.update(1/60,s,{tension:tier+1,freeCam:false});
   const position=s.worldPos(ball,[0,0,0]);return{tier,before,shakeBefore,contactShake,after:{x:ball.pvx,z:ball.pvz},hopY:ball.hopY,mode:ball.mode,visibleLift:position[1]-(bw.cy+bowlY(Math.hypot(ball.px,ball.pz),bw.R)+CFG.ball.r),funds:g.S.funds};
  }''',tier)
  assert result['after']['x']>0,result
  assert result['contactShake']<=result['shakeBefore']+1e-9,'contact should move the ball, not shake the camera'
  assert 0<result['hopY']<.01 and result['visibleLift']>0,result
  assert result['mode']=='bowl';assert result['funds']==40000
  # Render one real main-loop frame with the controlled physical pose frozen.
  # Paused gameplay deliberately retains its last canvas, so FX updates alone are insufficient.
  c.evaluate("""()=>{const g=SILVER_GAME,step=g.sim.step,render=g.refs.renderer.render;window.contactFrameRendered=false;g.sim.step=()=>{};g.refs.renderer.render=function(...args){const output=render.apply(this,args);g.sim.step=step;g.refs.renderer.render=render;g.S.phase='paused';window.contactFrameRendered=true;return output;};g.S.phase='play';}""")
  c.wait_for_function('()=>window.contactFrameRendered',timeout=30000)
  rendered=c.evaluate("""()=>{const g=SILVER_GAME,m=new g.refs.THREE.Matrix4();g.refs.ballsIM.getMatrixAt(0,m);return{count:g.refs.ballsIM.count,matrixY:m.elements[13],worldY:g.sim.worldPos(g.sim.balls[0],[0,0,0])[1],cameraZ:g.refs.camera.position.z}}""")
  assert rendered['count']==1 and abs(rendered['matrixY']-rendered['worldY'])<1e-6,rendered
  assert rendered['cameraZ']<1.2,rendered
  result['rendered']=rendered
  page.screenshot(path=str(OUT/f'lip-stage-{tier+1}.png'),timeout=60000);rows.append(result)
 pair=c.evaluate('''()=>{const g=SILVER_GAME,s=g.sim;s.balls.length=0;s.spawnInBowl(0);s.spawnInBowl(0);const[a,b]=s.balls;Object.assign(a,{px:-.024,pz:-.10,pvx:.6,pvz:.12});Object.assign(b,{px:.018,pz:-.082,pvx:-.3,pvz:0});s.collideBalls();return{a:{x:a.pvx,z:a.pvz},b:{x:b.pvx,z:b.pvz}}}''')
 assert abs(pair['a']['z']-.12)>.03,pair
 stall=c.evaluate('''()=>{const g=SILVER_GAME,s=g.sim;s.balls.length=0;s.spawnInBowl(0);const ball=s.balls[0],before=g.S.funds;Object.assign(ball,{bowlT:34.9,px:Math.cos(.5)*.0475,pz:Math.sin(.5)*.0475,pvx:0,pvz:0,dampMul:100});for(let i=0;i<240*5;i++)s.step(1/240);return{credit:g.S.funds-before,live:s.liveCount(),notice:g.ui.el.toasts.textContent};}''')
 assert stall['credit']==200 and stall['live']==0 and '返却' in stall['notice'],stall
 assert not errors
 (OUT/'contacts-browser.json').write_text(json.dumps({'controlledContacts':rows,'obliquePair':pair,'stalledBallReturn':stall,'errors':errors,'note':'Controlled contact setups, separate from natural-play survey.'},ensure_ascii=False,indent=2));print('retro contact browser passed',rows,pair);b.close()
