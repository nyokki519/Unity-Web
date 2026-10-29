"""Real UI confirmation with labelled known shoes: comparison, commission, tie and peak."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483');out=Path(os.environ.get('BACCARAT_TABLE_SCENARIOS','/workspace/scratch/baccarat-table-scenarios'));out.mkdir(parents=True,exist_ok=True)
scenarios=[('reference-round',[8,39,44,30,16],'player',10000,10000,5),('banker-commission',[1,2,14,3,9],'banker',1000,950,5),('tie-push',[1,14,2,15,3,16],'player',1000,0,6),('tie-hit',[1,14,2,15,3,16],'tie',1000,8000,6),('loss',[0,3,1,4],'player',1000,-1000,4),('large-win',[2,9,4,6],'player',100000,100000,4)]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);results=[]
 for label,cards,side,stake,net,count in scenarios:
  page=b.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script("localStorage.setItem('unity-baccarat-settings-v1',JSON.stringify({presentation:'standard',squeezeMode:'auto',betOrder:'area-first'}))");page.goto(base+'/baccarat/index.html');page.locator('[data-action=tables]').click();page.locator('[data-action="start:lounge"]').click();page.evaluate('(cards)=>{const s=BACCARAT.session.state;s.shoe.order=[...cards,...s.shoe.order.filter(x=>!cards.includes(x))];s.shoe.cursor=0;s.shoe.burn=0}',cards);before=page.evaluate('()=>BACCARAT.session.state.balance');page.locator(f'[data-action="bet:{side}"]').tap();assert page.evaluate('()=>Object.keys(BACCARAT.session.state.bets).length')==0
  for i in range(stake//min(stake,50000)):page.locator(f'[data-action="chip:{min(stake,50000)}"]').tap()
  assert page.evaluate('()=>BACCARAT.session.state.balance')==before;page.locator('[data-action=confirm]').click();expect(page.locator('[data-action=next]')).to_be_visible(timeout=20000);page.wait_for_timeout(600);receipt=page.evaluate('()=>BACCARAT.session.state.round.receipt');assert receipt['net']==net,(label,receipt);assert page.locator('.playing-card.revealed').count()==count;assert page.evaluate('()=>BACCARAT.session.state.balance')==before+net;assert page.locator('.settlement-light').count()==int(net>0);assert page.locator('.flying-chip,.ceremony-reflection,.ceremony-spark').count()<=24;page.screenshot(path=str(out/f'{label}-390.png'),full_page=True)
  points=page.locator('.hand .points').all_text_contents();face=page.locator('.playing-card.revealed .card-inner').evaluate_all('(nodes)=>nodes.every(n=>n.getAnimations().length===0)');assert face
  if label=='reference-round':assert points==['9','6'];page.locator('[data-action=roads]').click();expect(page.locator('.road-mark')).not_to_have_count(0);page.locator('[data-action=modal-close]').click();page.locator('[data-action=history]').click();page.screenshot(path=str(out/'history-390.png'),full_page=True);page.locator('[data-action=back]').click()
  assert not errors,errors;results.append({'scenario':label,'receipt':receipt,'points':points,'allFacesStable':face,'errors':errors});page.close()
 b.close();(out/'report.json').write_text(json.dumps(results,indent=2))
print('reference operation, commission, tie, loss and peak real UI scenarios passed')
