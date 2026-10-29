"""Independent persisted presentation controls never remove hostile projectiles."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SHOOTING_QA_DIR','docs/shooting/qa/art-pass'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/shooting/index.html');page.wait_for_function('!!window.SHOOTING',timeout=90000);page.evaluate("SHOOTING.navigate('settings')")
 page.locator('[data-setting=shake]').uncheck();page.locator('[data-setting=flash]').uncheck();page.locator('[data-setting=particleAmount]').select_option('0');page.screenshot(path=str(out/'independent-effects-settings-390.png'));page.reload();page.wait_for_function('!!window.SHOOTING')
 settings=page.evaluate('SHOOTING.profile.settings');assert settings['shake']==False and settings['flash']==False and settings['particleAmount']==0,settings
 page.evaluate("SHOOTING.start({seed:'effect-options',difficulty:'easy'});SHOOTING.pause()")
 zero=page.evaluate('''()=>{const r=SHOOTING.renderer,g=SHOOTING.game;r.clearPresentation();for(const type of ['shot','item','explosion','part','hit','bomb','special','overdrive','laser','graze'])r.event({type,x:240,y:300,boss:type==='explosion'});g.bullets.add(240,250,0,0,{owner:0,r:5,life:5});for(let i=0;i<45;i++){r.last=performance.now()-50;r.render(g);}return{particles:r.particles.length,particleInstances:r.particleMesh.count,smoke:r.smokes.length,debris:r.fragments.length,muzzles:r.muzzles.length,shake:r.shake,flash:r.flashMesh.visible,enemyBullets:r.enemyBullets.count};}''')
 assert all(zero[k]==0 for k in ['particles','particleInstances','smoke','debris','muzzles','shake']),zero
 assert not zero['flash'] and zero['enemyBullets']>0,zero
 separate=page.evaluate('''()=>{const r=SHOOTING.renderer;r.clearPresentation();r.setEffects({shake:false,flash:true,particleAmount:1});r.event({type:'special'});r.render(SHOOTING.game);const a={shake:r.shake,flash:r.flashMesh.visible,particles:r.particles.length};r.clearPresentation();r.setEffects({shake:true,flash:false,particleAmount:.5});r.event({type:'special'});r.render(SHOOTING.game);const b={shake:r.shake,flash:r.flashMesh.visible,particles:r.particles.length};r.clearPresentation();r.setReduced(true);r.setEffects({shake:true,flash:true,particleAmount:1});r.event({type:'special'});r.render(SHOOTING.game);return{flashOnly:a,shakeOnly:b,reduced:{shake:r.shake,flash:r.flashMesh.visible,particles:r.particles.length}};}''')
 assert separate['flashOnly']['shake']==0 and separate['flashOnly']['flash'],separate
 assert separate['shakeOnly']['shake']>0 and not separate['shakeOnly']['flash'],separate
 assert separate['shakeOnly']['particles']<separate['flashOnly']['particles'],separate
 assert separate['reduced']['shake']==0 and not separate['reduced']['flash'],separate
 assert not errors,errors
 report={'persisted':{k:settings[k] for k in ['shake','flash','particleAmount']},'zeroCosmeticParticles':zero,'independent':separate,'errors':errors};(out/'effects-settings-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
