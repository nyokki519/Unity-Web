"""Same known shoe/bet/camera/speed, actual UI confirmations on immutable baseline and current."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,shutil,tempfile,json
out=Path(os.environ.get('ART_COMPARE_OUT','docs/baccarat/qa/art-pass/comparison'));out.mkdir(parents=True,exist_ok=True)
cache=Path(tempfile.gettempdir())/'unity-baccarat-playwright';binary=cache/'ffmpeg-1011'/'ffmpeg-linux';binary.parent.mkdir(parents=True,exist_ok=True)
if not binary.exists():binary.symlink_to(shutil.which('ffmpeg'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(cache))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);reports=[]
 for tag,base in [('before',os.environ.get('BACCARAT_BEFORE_URL','http://127.0.0.1:3784')),('after',os.environ.get('UNITY_URL','http://127.0.0.1:3483'))]:
  c=b.new_context(viewport={'width':390,'height':844},has_touch=True,record_video_dir=str(out/tag),record_video_size={'width':390,'height':844});page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.add_init_script("localStorage.setItem('unity-baccarat-settings-v1',JSON.stringify({presentation:'standard',squeezeMode:'auto',bgm:.15,speed:'normal'}))");page.goto(base+'/baccarat/index.html');page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();page.evaluate('''()=>{const cards=[11,6,8,13],s=BACCARAT.session.state;s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=0;s.shoe.burn=0;}''');page.locator('[data-action="bet:player"]').click();page.screenshot(path=str(out/f'{tag}-wager-390.png'),full_page=True);page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=15000);page.wait_for_timeout(500);page.screenshot(path=str(out/f'{tag}-win-390.png'),full_page=True);state=page.evaluate('BACCARAT.session.state');assert state['round']['receipt']['net']==1000;page.wait_for_timeout(1100);assert not errs;reports.append({'tag':tag,'shoe':[11,6,8,13],'bet':1000,'viewport':[390,844],'speed':'normal','net':1000,'errors':errs});video=page.video;page.close();video.save_as(str(out/f'{tag}-same-deal.webm'));c.close()
 b.close();(out/'report.json').write_text(json.dumps(reports,indent=2));print('same-deal before/after passed')
