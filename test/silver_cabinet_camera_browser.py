"""Verify exterior and controls remain usable across the pachinko view presets."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get('UNITY_RETRO_URL', 'http://127.0.0.1:8765/silver-ring/index.html') + '?seed=cabinet-camera-qa'
out = Path(os.environ.get('SILVER_CABINET_QA_DIR', 'docs/qa/retro-cabinet-lamps/final'))
out.mkdir(parents=True, exist_ok=True)
rows = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base, wait_until='domcontentloaded')
    page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
    page.locator('#btnStart').click()
    page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
    for preset in ['auto', 'wide', 'cradle1', 'cradle2', 'cradle3']:
        page.evaluate('(preset) => { SILVER_GAME.S.manualCamera = preset; SILVER_GAME.fx.detailView = preset.startsWith("cradle"); }', preset)
        expected = 'CRUUNE' if preset.startswith('cradle') else 'WIDE'
        page.wait_for_function('(expected) => SILVER_GAME.fx.camMode === expected', arg=expected)
        state = page.evaluate('''() => ({camera: SILVER_GAME.refs.camera.position.toArray(), target: SILVER_GAME.fx.curTgt.toArray(),
          bounds: (() => { const b = new SILVER_GAME.refs.THREE.Box3().setFromObject(SILVER_GAME.refs.machineG); return {min:b.min.toArray(),max:b.max.toArray()}; })(),
          boardChildren: SILVER_GAME.refs.boardG.children.length, phase:SILVER_GAME.S.phase})''')
        assert all(abs(v) < 100 for v in state['camera'] + state['target']), (preset, state)
        assert state['phase'] == 'play' and state['boardChildren'] == 54, (preset, state)
        page.screenshot(path=str(out / f'camera-{preset}.png'))
        rows.append({'preset': preset, 'mode': expected, **state})
    page.locator('#mCam').click()
    page.wait_for_function('() => SILVER_GAME.S.freeCam')
    assert page.locator('#singleShot').is_visible()
    page.locator('#singleShot').click()
    assert page.evaluate('SILVER_GAME.S.fired') == 1
    assert page.evaluate('SILVER_GAME.S.funds') == 49800
    assert not errors, errors
    rows.append({'freeCamera': True, 'shotStillWorks': True, 'errors': errors})
    browser.close()

target = out / 'camera-results.json'
target.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps(rows, ensure_ascii=False))
