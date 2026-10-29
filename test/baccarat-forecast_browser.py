"""Visual-only forecast palette fixture on a real settled practice hand."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('BACCARAT_ART_QA','/tmp/baccarat-art-pass'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.goto(os.environ.get('UNITY_URL','http://127.0.0.1:3483')+'/baccarat/index.html');page.wait_for_function('()=>!!window.BACCARAT')
 for w in [375,390,414]:
  page.set_viewport_size({'width':w,'height':844});page.screenshot(path=str(out/f'title-{w}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert page.locator('.subtitle-tail').count()==1
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-action=tutorial]').click();page.locator('[data-action="bet:player"]').click();page.locator('[data-action=confirm]').click();page.wait_for_function("()=>BACCARAT.session.state.phase==='result'",timeout=12000);page.wait_for_timeout(900)
 for tier in ['blue','green','red','rainbow']:
  page.locator('.felt').evaluate('(node,tier)=>node.dataset.forecast=tier',tier);page.wait_for_timeout(60);assert page.locator('.felt').evaluate('(node)=>getComputedStyle(node).borderTopColor')=='rgba(0, 0, 0, 0)';assert page.locator('.felt').evaluate('(node)=>getComputedStyle(node,"::after").borderTopWidth')=='0px';page.screenshot(path=str(out/f'forecast-{tier}-390.png'),full_page=True)
 b.close()
print('forecast rail and mobile title passed')
