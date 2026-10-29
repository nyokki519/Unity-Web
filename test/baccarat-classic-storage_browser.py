import os
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('UNITY_URL','http://127.0.0.1:3483')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')}");page.goto(base+'/baccarat/index.html');page.locator('[data-classic=start]').click();expect(page.locator('#storage-warning')).to_be_visible(timeout=2000);assert page.evaluate('()=>CLASSIC.controller.session===null');page.close()
 page=b.new_page();page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})");page.goto(base+'/baccarat/index.html');page.locator('[data-classic=start]').click();expect(page.locator('#storage-warning')).to_be_visible();expect(page.locator('[data-classic=deal]')).to_be_visible();b.close()
print('startup quota reports visible failure without phantom session; denied storage clearly uses memory only')
