"""Short real-time mobile stress check of automatic shots and exterior event lights."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get('UNITY_RETRO_URL', 'http://127.0.0.1:8765/silver-ring/index.html') + '?seed=cabinet-autofire-qa'
out = Path(os.environ.get('SILVER_CABINET_QA_DIR', 'docs/qa/retro-cabinet-lamps/final'))
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base, wait_until='domcontentloaded')
    page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
    page.locator('#btnStart').click()
    page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
    page.evaluate("SILVER_GAME.S.manualCamera='wide'")
    page.locator('#mAuto').click()
    page.wait_for_function('() => SILVER_GAME.S.fired >= 20', timeout=90000)
    page.locator('#mAuto').click()
    state = page.evaluate('''() => ({phase:SILVER_GAME.S.phase,auto:SILVER_GAME.S.auto,fired:SILVER_GAME.S.fired,
      funds:SILVER_GAME.S.funds,gates:SILVER_GAME.S.gates,lamps:Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array),
      boardChildren:SILVER_GAME.refs.boardG.children.length,renderCalls:SILVER_GAME.refs.renderer.info.render.calls,
      triangles:SILVER_GAME.refs.renderer.info.render.triangles,scrollWidth:document.documentElement.scrollWidth})''')
    assert state['phase'] == 'play' and not state['auto'] and state['fired'] >= 20, state
    assert state['funds'] == 50000 - 200 * state['fired'], state
    assert state['boardChildren'] == 54 and state['renderCalls'] <= 230 and state['triangles'] <= 185000, state
    assert state['scrollWidth'] == 390 and not errors, (state, errors)
    page.evaluate('SILVER_GAME.toBowl(2)')
    page.wait_for_function("() => SILVER_GAME.fx.cabinetPulse?.kind === 'bowl' && SILVER_GAME.fx.cabinetPulse.age > 0.1 && SILVER_GAME.fx._cabinetLampSignature.startsWith('emerald:')", timeout=20000)
    state['bowlPulseLamp'] = page.evaluate('Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array)')
    assert state['bowlPulseLamp'] > 0.5, state
    page.screenshot(path=str(out / 'autofire-390.png'))
    target = out / 'autofire-results.json'
    target.write_text(json.dumps({'state': state, 'errors': errors}, ensure_ascii=False, indent=2))
    print(json.dumps({'state': state, 'errors': errors}, ensure_ascii=False))
    browser.close()
