"""Mobile selection geometry, full-card and keyboard operation; actual Chromium UI."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3200');p.add_argument('--output',default='/tmp/unity-question-ui');args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [375,390,414]:
  page=b.new_page(viewport={'width':width,'height':844});page.goto(args.url);page.get_by_role('button',name='ルームをつくる ↗',exact=True).click()
  def geometry():
   return page.locator('.mode-option').evaluate_all('els=>els.map(el=>{const r=el.querySelector("input").getBoundingClientRect(),c=el.getBoundingClientRect();const texts=[...el.querySelectorAll("span,strong,small")].filter(n=>n.textContent.trim());return {mode:el.querySelector("input").value,gap:Math.min(...texts.map(n=>n.getBoundingClientRect().left-r.right)),contained:texts.every(n=>{const t=n.getBoundingClientRect();return t.left>=c.left&&t.right<=c.right+1&&t.bottom<=c.bottom+1}),tapWidth:c.width,tapHeight:c.height}})')
  rows=geometry();assert all(r['gap']>=12 for r in rows),rows;assert all(r['contained'] and r['tapWidth']>=44 and r['tapHeight']>=44 for r in rows),rows
  cards=page.locator('.mode-option');cards.nth(2).locator('small').click();expect(cards.nth(2).locator('input')).to_be_checked();cards.nth(2).locator('input').focus();page.keyboard.press('ArrowRight');expect(cards.nth(3).locator('input')).to_be_checked()
  page.locator('.mode-picker').screenshot(path=str(out/f'after-{width}.png'))
  page.locator('.mode-option small').first.evaluate("n=>n.textContent='一人の回答を予想して、本人の答えとイメージの違いについて、答えにくいことはパスしながらゆっくり話すモードです。'.repeat(3)")
  assert all(r['contained'] and r['gap']>=12 for r in geometry());assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('.mode-picker').screenshot(path=str(out/f'long-{width}.png'));report.append({'width':width,'overlap':False,'longText':True,'cardTap':True,'keyboard':True});page.close()
 b.close()
(out/'selection-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS 375/390/414px: geometry, long text, card selection and keyboard')
