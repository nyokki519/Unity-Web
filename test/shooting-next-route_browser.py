"""The next campaign route stays reachable on short portrait displays."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    for width, height in [(320, 568), (375, 667), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.goto('http://127.0.0.1:3000/shooting/index.html', wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SHOOTING')
        page.locator('[data-do=quickstart]').click()
        page.evaluate("() => {SHOOTING.game.collect('P');SHOOTING.game.damageEnemy(SHOOTING.game.spawnEnemy(11,240,135,true,false),1e9)}")
        page.wait_for_function("() => !!document.querySelector('[data-do=next]')")
        bounds = page.evaluate('''() => {
          const box = s => {const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom}};
          return {button:box('[data-do=next]'),overlay:box('#overlay'),stage:SHOOTING.game.stage,level:SHOOTING.game.player.level};
        }''')
        assert bounds['button']['top'] >= bounds['overlay']['top'], (width, height, bounds)
        assert bounds['button']['bottom'] <= bounds['overlay']['bottom'], (width, height, bounds)
        old_level = bounds['level']
        page.locator('[data-do=next]').click()
        page.wait_for_function('() => SHOOTING.game.stage === 1 && document.querySelector("#overlay").hidden')
        assert page.evaluate('SHOOTING.game.player.level') == old_level
        print(f'{width}x{height}: next-route action visible and carries upgrades')
        page.close()
    browser.close()
