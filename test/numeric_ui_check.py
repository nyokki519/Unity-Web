"""Actual-unit inputs/results in two independent browser contexts."""
import argparse,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3201');p.add_argument('--output',default='/tmp/unity-question-ui');args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);report=[]
 for game,values,unit,mean in [('LINE',[2,15],'人','8.5人'),('BOUNDARY',[15,30],'分','22.5分')]:
  contexts=[b.new_context(viewport={'width':390,'height':844}) for _ in range(2)];host,guest=[c.new_page() for c in contexts]
  host.goto(args.url);host.get_by_role('button',name='ルームをつくる ↗',exact=True).click();host.locator('input[name=name]').fill('司会')
  if game=='LINE':host.locator('input[name=mode][value=LINE]').check();host.locator('select[name=category]').select_option('FRIENDS')
  else:host.locator('select[name=eventGame]').select_option('BOUNDARY')
  host.locator('form').get_by_role('button',name='ルームをつくる ↗',exact=True).click();expect(host.locator('.room-code')).to_be_visible();code=host.locator('.room-code').inner_text()
  guest.goto(args.url+'/?room='+code);guest.locator('input[name=name]').fill('ゲスト');guest.get_by_role('button',name='参加する ↗',exact=True).click();expect(guest.locator('.room-code')).to_be_visible()
  for page in [host,guest]:page.get_by_role('button',name='準備できた ✓',exact=True).click()
  host.locator('#start-button').click()
  if game=='BOUNDARY':
   expect(host.locator('select[name=event-question]')).to_be_visible();host.locator('select[name=event-question]').select_option('boundary-01');host.get_by_role('button',name='回答・相談を始める',exact=True).click()
  for page,v in [(host,values[0]),(guest,values[1])]:
   slider=page.locator('input[type=range]');expect(slider).to_be_visible();slider.fill(str(v));expect(page.locator('.line-value')).to_have_text(str(v)+unit);expect(slider).to_have_attribute('aria-valuetext',str(v)+unit)
   page.locator('#event-submit' if game=='BOUNDARY' else '#submit-answer').click()
  if game=='BOUNDARY':
   expect(guest.locator('.event-saved-value')).to_have_text('30分');time.sleep(.8);host.get_by_role('button',name='回答を締め切る',exact=True).click();time.sleep(.8);host.get_by_role('button',name='回答を公開する',exact=True).click()
  for page in [host,guest]:
   expect(page.locator('.line-result')).to_be_visible(timeout=10000);expect(page.locator('.result-stats')).to_contain_text(mean);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.line-marker').count()==2
  positions=host.locator('.line-marker').evaluate_all('els=>els.map(e=>e.style.left)');assert positions==(['0%','100%'] if game=='LINE' else ['50%','100%']),positions
  host.screenshot(path=str(out/f'numeric-{game.lower()}-390.png'),full_page=True);report.append({'game':game,'values':values,'unit':unit,'average':mean,'positions':positions,'contexts':2})
  for c in contexts:c.close()
 b.close()
(out/'numeric-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS numeric people/minutes: input, submission, mean, anonymous graph, two contexts')
