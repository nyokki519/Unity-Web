"""Real committed UI deals with known shoes, including net-positive/tie/loss effects.
Fixtures are installed only inside a new isolated browser profile before confirmation.
"""
import json,os,shutil,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');out=Path(os.environ.get('BACCARAT_ART_QA','/tmp/baccarat-art-pass'));out.mkdir(parents=True,exist_ok=True)
cache=Path(tempfile.gettempdir())/'unity-baccarat-playwright';binary=cache/'ffmpeg-1011'/'ffmpeg-linux';binary.parent.mkdir(parents=True,exist_ok=True)
if not binary.exists():binary.symlink_to(shutil.which('ffmpeg'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(cache))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},has_touch=True,record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/baccarat/index.html');page.wait_for_function('()=>!!window.BACCARAT');page.screenshot(path=str(out/'title-390.png'),full_page=True);page.set_viewport_size({'width':1920,'height':1080});page.screenshot(path=str(out/'title-1920.png'),full_page=True);page.set_viewport_size({'width':390,'height':844})
 page.locator('#settings-link').click();page.locator('[data-setting=presentation]').select_option('standard');page.locator('[data-action=back]').click();page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();results=[]
 def fresh():
  page.evaluate("()=>{localStorage.removeItem('unity-baccarat-session-v1');localStorage.removeItem('unity-baccarat-session-v1-backup')}");page.reload();page.wait_for_function('()=>!!window.BACCARAT');page.locator('[data-action=tables]').click();page.locator('[data-action=\"start:lounge\"]').click();page.evaluate("async()=>{window.audioTrace=[];const {Audio}=await import('./audio.js');const event=Audio.prototype.event;Audio.prototype.event=function(kind){window.audioTrace.push({kind,at:performance.now(),state:this.ctx?.state,voices:this.active});return event.call(this,kind)}}")
 for label,cards,expected in [('win',[2,9,4,6],1),('tie',[1,14,2,15,3,16],0),('tie-hit',[1,14,2,15,3,16],1),('loss',[0,3,1,4],-1),('large-win',[2,9,4,6],1)]:
  fresh();page.evaluate('(cards)=>{const s=BACCARAT.session.state;s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=0;s.shoe.burn=0}',cards)
  if label=='large-win':page.locator('[data-action="chip:50000"]').click();page.locator('[data-action="bet:player"]').click()
  side='tie' if label=='tie-hit' else 'player'
  page.locator(f'[data-action="bet:{side}"]').click();page.screenshot(path=str(out/f'{label}-wager-390.png'),full_page=True);before=page.evaluate('BACCARAT.session.state.balance');page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=12000);net=page.evaluate('BACCARAT.session.state.round.receipt.net');assert (net>0)-(net<0)==expected,(label,net)
  page.wait_for_timeout(430);effects=page.evaluate('()=>new Promise(resolve=>{let peak=0;const start=performance.now();const tick=()=>{peak=Math.max(peak,document.querySelectorAll(".flying-chip").length);if(performance.now()-start>320)resolve(peak);else requestAnimationFrame(tick)};tick()})');lit=page.locator('.settlement-light').count();assert effects<=18
  if expected<=0:assert lit==0
  if expected>0:assert lit==1
  page.screenshot(path=str(out/f'{label}-settlement-390.png'),full_page=True);page.wait_for_timeout(1500);assert page.locator('.flying-chip,.card-sheen').count()==0;assert page.evaluate('BACCARAT.session.state.balance')==before+net;page.screenshot(path=str(out/f'{label}-receipt-390.png'),full_page=True);trace=page.evaluate('audioTrace');assert any(e['kind']==('win' if expected>0 else 'loss' if expected<0 else 'tie') and e['state']=='running' for e in trace);assert all(e['voices']<=20 for e in trace);results.append({'result':label,'net':net,'peakChips':effects,'positiveLighting':bool(lit),'audioEvents':trace})
  if label!='large-win':page.locator('[data-action=next]').click()
 for w,h in [(375,812),(390,844),(414,896),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'table-{w}.png'),full_page=True)
 # A queued cascade is cancelled on Next rather than landing in the next hand.
 fresh();page.evaluate('(cards)=>{const s=BACCARAT.session.state;s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=0;s.shoe.burn=0}',[2,9,4,6]);page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'");page.locator('[data-action=next]').click();page.wait_for_timeout(1000);assert page.locator('.flying-chip,.settlement-light').count()==0;assert not errors,errors
 (out/'report.json').write_text(json.dumps({'results':results,'cancelOnNext':True,'mobileWidths':[375,390,414],'desktop':1920,'errors':errors},indent=2));c.close();Path(page.video.path()).replace(out/'art-pass.webm');b.close()
print('baccarat art actual win/tie/loss and cancellation passed')
