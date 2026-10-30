"""Independent acceptance of real DOM gestures and transactional salon accounting."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('UNITY_URL','http://127.0.0.1:3483').rstrip('/')
OUT=Path('.superpowers/sdd/baccarat-salon'); OUT.mkdir(parents=True,exist_ok=True)
results=[]
def check(name, fn):
    if os.environ.get('SALON_CHECK') and os.environ['SALON_CHECK'] not in name: return
    fn(); results.append(name); print('PASS',name,flush=True)
def action(page,name):
    if name=='skip': return page.locator('[data-action="skip"]:visible:not([inert] *)').first
    for scope in ['#salon-panel[open]','#salon-squeeze:not([hidden])','']:
        candidate=page.locator(f'{scope} [data-action="{name}"]:visible'.strip())
        if candidate.count(): return candidate.first
    return page.locator(f'[data-action="{name}"]:visible').first
def state(page): return page.evaluate('SALON.controller.session.state')
def start(page):
    page.goto(BASE+'/baccarat/index.html'); expect(page.locator('.salon-title')).to_be_visible(timeout=10000)
    action(page,'start').click(); page.wait_for_function('() => window.SALON?.controller.session?.state.phase === "betting"')
def fixture(page,cards):
    page.evaluate('''cards=>{const shoe=SALON.controller.session.state.shoe,prefix=shoe.order.slice(0,shoe.cursor),rest=shoe.order.slice(shoe.cursor),chosen=[];for(const card of cards){const i=rest.findIndex(x=>x%13===card%13);if(i<0)throw Error('fixture exhausted rank');chosen.push(rest.splice(i,1)[0]);}shoe.order=[...prefix,...chosen,...rest];}''',cards)
def bet(page,side='banker',chip=1):
    action(page,f'bet:{side}').click(); action(page,f'chip:{chip}').click()
def finish(page,skip=True):
    if skip:
        expect(page.locator('#salon-squeeze')).to_be_visible(timeout=15000)
        page.locator('#salon-squeeze [data-action="skip"]').click()
    page.wait_for_function('() => SALON.controller.session.state.phase === "result"',timeout=20000)
    expect(page.locator('#salon-receipt')).to_be_visible()
def next_round(page):
    action(page,'next').click(); page.wait_for_function('() => SALON.controller.session.state.phase === "betting"')
def place_fixture(page,cards,side='banker',chip=1):
    fixture(page,cards); bet(page,side,chip); action(page,'confirm').click()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    check('independent title and session startup',lambda:start(page))
    def target_and_coins():
        before=state(page)['balance'];action(page,'bet:player').click();assert state(page)['bets']=={}
        action(page,'chip:10').click();action(page,'chip:10').click();assert state(page)['bets']=={'player':2000}
        assert page.locator('[data-action="bet:player"] .salon-bet-coins img').count()==2
        action(page,'undo').click();assert state(page)['bets']=={'player':1000}
        action(page,'bet:banker').click();action(page,'chip:10').click();action(page,'bet:tie').click();action(page,'chip:10').click()
        assert state(page)['bets']=={'player':1000,'banker':1000,'tie':1000};assert state(page)['balance']==before
        action(page,'undo').click();assert state(page)['bets']=={'player':1000,'banker':1000}
        action(page,'clear').click();assert state(page)['bets']=={};assert page.locator('.salon-bet-coins img').count()==0
    check('field selection and repeated coin presses stack without spending wallet; undo clear',target_and_coins)
    def banker():
        before=state(page)['balance'];place_fixture(page,[0,3,1,4]);finish(page)
        s=state(page);assert s['round']['plan']['winner']=='banker';assert s['round']['receipt']['returned']==195;assert s['balance']==before+95
        page.evaluate('SALON.controller.session.settle()');assert state(page)['balance']==before+95
        page.screenshot(path=str(OUT/'mobile-banker-receipt.png'),full_page=True)
        next_round(page);action(page,'repeat').click();assert state(page)['bets']=={'banker':100};action(page,'clear').click()
    check('natural banker exact commission and no duplicate settlement; repeat',banker)
    def tie():
        before=state(page)['balance'];fixture(page,[3,16,4,17]);bet(page,'player');bet(page,'banker');bet(page,'tie');action(page,'confirm').click();finish(page)
        s=state(page);assert s['round']['plan']['winner']=='tie';assert s['round']['receipt']['returned']==1100;assert s['balance']==before+800
        next_round(page)
    check('legal natural tie pays 8:1 and pushes main bets',tie)
    def third_and_drag():
        place_fixture(page,[0,13,1,14,2,3],'player',10)
        expect(page.locator('[data-squeeze="finish"]')).to_be_visible(timeout=15000)
        revealed=state(page)['round']['revealed']
        for name in ['settings','history']:
            action(page,name).click();expect(page.locator('#salon-panel')).to_be_visible();page.wait_for_timeout(120)
            assert state(page)['round']['revealed']==revealed
            page.keyboard.press('Escape');expect(page.locator('#salon-panel')).not_to_be_visible();page.wait_for_timeout(50)
        host=page.locator('.salon-squeeze__stage');host.scroll_into_view_if_needed();box=host.bounding_box();assert box
        page.mouse.move(box['x']+box['width']*.5,box['y']+box['height']*.7);page.mouse.down()
        for i in range(1,9):page.mouse.move(box['x']+box['width']*(.5+.045*i),box['y']+box['height']*(.7-.06*i),steps=2)
        assert page.evaluate('SALON.squeeze.progress')>0, 'drag must change card peel progress'
        page.mouse.up()
        finish(page);s=state(page);assert len(s['round']['plan']['cards'])==6;assert s['round']['plan']['player']==6 and s['round']['plan']['banker']==7
        assert s['round']['receipt']['returned']==0
        for width in [375,390,414,1440]:
            page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(50)
            geometry=page.locator('.salon-hand').evaluate_all('''hands=>hands.map(hand=>{const h=hand.getBoundingClientRect();return [...hand.querySelectorAll('.salon-card')].map(card=>{const c=card.getBoundingClientRect();return {inside:c.left>=h.left-1&&c.right<=h.right+1,width:c.width,height:c.height};});}).flat()''')
            assert len(geometry)==6 and all(c['inside'] and c['width']>30 and c['height']>40 for c in geometry),(width,geometry)
        page.set_viewport_size({'width':390,'height':844})
    check('legal six-card third draw and real pointer gesture followed by skip',third_and_drag)
    def reload():
        before=state(page);page.reload();expect(action(page,'resume')).to_be_visible();action(page,'resume').click()
        page.wait_for_function('() => SALON.controller.session?.state.phase === "result"');after=state(page)
        assert after['balance']==before['balance'] and len(after['history'])==len(before['history'])
        next_round(page)
    check('saved result reload does not repay',reload)
    def failed_confirm():
        fixture(page,[0,3,1,4]);bet(page);before=state(page)
        page.evaluate('window.originalCommit=SALON.controller.session.commit;SALON.controller.session.commit=()=>false')
        action(page,'confirm').click();page.wait_for_timeout(100)
        after=state(page);assert after['balance']==before['balance'] and after['sequence']==before['sequence'] and after['phase']=='betting'
        expect(page.locator('#salon-message')).not_to_be_empty()
        action(page,'retry').click();assert state(page)['balance']==before['balance'] and state(page)['sequence']==before['sequence']
        expect(action(page,'retry')).to_be_visible()
        page.evaluate('SALON.controller.session.commit=window.originalCommit')
        action(page,'retry').click();finish(page);assert state(page)['balance']==before['balance']+95
        next_round(page)
    check('failed confirmation is atomic and retry charges once',failed_confirm)
    def settlement_and_next_failures():
        place_fixture(page,[0,3,1,4]);before=state(page)
        page.evaluate('window.originalCommit=SALON.controller.session.commit;SALON.controller.session.commit=()=>false')
        action(page,'skip').click();page.wait_for_timeout(100)
        assert state(page)['balance']==before['balance'] and len(state(page)['history'])==len(before['history'])
        expect(action(page,'retry')).to_be_visible()
        page.evaluate('SALON.controller.session.commit=window.originalCommit');action(page,'retry').click()
        page.wait_for_function('() => SALON.controller.session.state.phase === "result"')
        paid=state(page);assert paid['balance']==before['balance']+195
        page.evaluate('SALON.controller.session.commit=()=>false');action(page,'next').click()
        assert state(page)['phase']=='result' and state(page)['balance']==paid['balance']
        page.evaluate('SALON.controller.session.commit=window.originalCommit');action(page,'retry').click()
        page.wait_for_function('() => SALON.controller.session.state.phase === "betting"')
        assert state(page)['balance']==paid['balance'] and len(state(page)['history'])==len(paid['history'])
    check('failed settlement and next retry exactly once without hidden debit',settlement_and_next_failures)
    def interrupted_and_rebet():
        place_fixture(page,[0,3,1,4]);before=state(page)
        page.reload();expect(action(page,'resume')).to_be_visible();action(page,'resume').click()
        page.wait_for_function('() => SALON.controller.session?.state.phase === "dealing" || SALON.controller.session?.state.phase === "judging"')
        finish(page)
        settled=state(page);assert settled['balance']==before['balance']+195 and len(settled['history'])==len(before['history'])+1
        page.evaluate('window.originalCommit=SALON.controller.session.commit;SALON.controller.session.commit=()=>false')
        action(page,'rebet').click();assert state(page)['phase']=='result' and state(page)['balance']==settled['balance']
        expect(action(page,'retry')).to_be_visible()
        page.evaluate('SALON.controller.session.commit=window.originalCommit');action(page,'retry').click()
        page.wait_for_function('() => SALON.controller.session.state.phase === "dealing" || SALON.controller.session.state.phase === "judging"')
        assert state(page)['balance']==settled['balance']-100
        finish(page);assert len(state(page)['history'])==len(settled['history'])+1
        next_round(page)
    check('interrupted committed round resumes once; rebet failure and retry',interrupted_and_rebet)
    def panels():
        for name in ['settings','history','help']:
            action(page,name).click();expect(page.locator('#salon-panel')).to_be_visible()
            assert page.evaluate('document.querySelector("#salon-panel").contains(document.activeElement)')
            before=state(page)
            page.keyboard.press('Tab');assert page.evaluate('document.querySelector("#salon-panel").contains(document.activeElement)')
            assert state(page)['balance']==before['balance'] and state(page)['sequence']==before['sequence']
            page.keyboard.press('Escape');expect(page.locator('#salon-panel')).not_to_be_visible();page.wait_for_timeout(50)
        action(page,'bet:player').focus();page.keyboard.press('Enter');action(page,'chip:1').focus();page.keyboard.press('Enter');assert state(page)['bets']=={'player':100},state(page)['bets']
        action(page,'clear').click()
    check('native panels focus Escape and keyboard wagering',panels)
    def responsive():
        for width,height in [(375,667),(390,844),(414,896),(1440,900)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow {width}'
            small=page.locator('button:visible').evaluate_all('els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(e=>({action:e.dataset.action,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
            assert not small,(width,small)
            overlaps=page.locator('button:visible').evaluate_all('''els=>{const r=els.map(e=>({a:e.dataset.action,r:e.getBoundingClientRect()}));const out=[];for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],b=r[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1)out.push([a.a,b.a]);}return out;}''')
            assert not overlaps,(width,overlaps)
            page.screenshot(path=str(OUT/f'viewport-{width}.png'),full_page=True)
    check('375 390 414 desktop fit and minimum 44px buttons',responsive)
    def storage_startup():
        denied=browser.new_context();dp=denied.new_page()
        dp.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})")
        start(dp);expect(dp.locator('#salon-message')).not_to_be_empty();assert state(dp)['balance']==5000000
        denied.close()
        quota=browser.new_context();qp=quota.new_page()
        qp.add_init_script("window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')}")
        qp.goto(BASE+'/baccarat/index.html');action(qp,'start').click()
        assert qp.evaluate('SALON.controller.session===null');expect(action(qp,'retry')).to_be_visible()
        qp.evaluate('() => {Storage.prototype.setItem=window.originalSetItem}');action(qp,'retry').click()
        qp.wait_for_function('() => SALON.controller.session?.state.phase === "betting"');assert state(qp)['balance']==5000000
        quota.close()
        temporary=browser.new_context();tp=temporary.new_page()
        tp.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')}")
        tp.goto(BASE+'/baccarat/index.html');action(tp,'start').click();action(tp,'temporary').click()
        tp.wait_for_function('() => SALON.controller.session?.state.phase === "betting"')
        expect(tp.locator('.salon-game')).to_be_visible();assert state(tp)['balance']==5000000
        temporary.close()
    check('denied storage explicit temporary play; quota startup retry has no phantom session',storage_startup)
    def reset_failure():
        rc=browser.new_context();rp=rc.new_page();start(rp);saved=state(rp)
        rp.reload();action(rp,'new-session').click()
        rp.evaluate('() => {window.originalControllerCommit=SALON.controller.commit;SALON.controller.commit=()=>false}')
        action(rp,'reset-session').click();assert state(rp)['id']==saved['id']
        retry=rp.locator('#salon-panel [data-action="retry"]:visible');expect(retry).to_be_visible()
        rp.evaluate('() => {SALON.controller.commit=window.originalControllerCommit}');retry.click()
        expect(rp.locator('#salon-panel')).not_to_be_visible();expect(rp.locator('.salon-game')).to_be_visible()
        assert state(rp)['id']!=saved['id'] and state(rp)['balance']==5000000
        rc.close()
    check('failed reset preserves prior session and offers usable native-panel retry',reset_failure)
    def reveal_save_retry():
        rc=browser.new_context(reduced_motion='reduce');rp=rc.new_page();reveal_errors=[];rp.on('pageerror',lambda e:reveal_errors.append(str(e)))
        start(rp);fixture(rp,[0,3,1,4]);bet(rp)
        rp.evaluate('() => {SALON.settings.squeeze="off";SALON.settings.reduced=true;window.realCommit=SALON.controller.session.commit;SALON.controller.session.commit=s=>s.round?.revealed>0&&!s.round.paid?false:window.realCommit(s)}')
        action(rp,'confirm').click();expect(action(rp,'retry')).to_be_visible()
        before=state(rp);assert before['phase']=='dealing' and before['round']['revealed']==0 and before['balance']==4999900
        rp.evaluate('() => {SALON.controller.session.commit=window.realCommit}');action(rp,'retry').click()
        rp.wait_for_function('() => SALON.controller.session.state.phase === "result"')
        expect(rp.locator('#salon-notice')).not_to_be_visible();assert rp.locator('[data-action="retry"]:visible').count()==0
        after=state(rp);assert len(after['history'])==1 and after['stats']['rounds']==1 and after['balance']==5000095
        assert not reveal_errors,reveal_errors;rc.close()
    check('async reveal save checkpoint retry clears stale error and settles once',reveal_save_retry)
    assert not errors,errors
    browser.close()
command=("SALON_CHECK="+repr(os.environ['SALON_CHECK'])+" " if os.environ.get('SALON_CHECK') else "")+"python test/baccarat-salon_browser.py"
(OUT/'qa-report.md').write_text('# Baccarat salon browser QA\n\nCommand: `'+command+'`\n\nURL: '+BASE+'\n\n'+ '\n'.join('- PASS '+r for r in results)+'\n\nScreenshots: '+', '.join(str(p) for p in OUT.glob('*.png'))+'\n')
print(f'{len(results)} independent salon checks passed')
