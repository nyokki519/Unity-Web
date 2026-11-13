"""Check cabinet lamp fidelity and controls across mobile rendering quality modes."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

base = os.environ.get('UNITY_RETRO_URL', 'http://127.0.0.1:8765/silver-ring/index.html') + '?seed=cabinet-quality-qa'
out = Path(os.environ.get('SILVER_CABINET_QA_DIR', 'docs/qa/retro-cabinet-lamps/final'))
out.mkdir(parents=True, exist_ok=True)
rows = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for width in [375, 390, 414]:
        page = browser.new_page(viewport={'width': width, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base, wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
        page.locator('#btnStart').click()
        page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
        page.evaluate("SILVER_GAME.S.manualCamera='wide'; SILVER_GAME.fx.pulseCabinet('sink',2,true)")
        page.wait_for_function("() => SILVER_GAME.fx.cabinetPulse?.age > 0.1 && SILVER_GAME.fx._cabinetLampSignature.startsWith('champagne:')", timeout=20000)
        for quality in ['low', 'high']:
            page.evaluate('(quality) => window.postMessage({source:"silver-shell",type:"quality",value:quality},location.origin)', quality)
            page.wait_for_timeout(200)
            state = page.evaluate('''() => ({quality:SILVER_GAME.refs.quality(),phase:SILVER_GAME.S.phase,
              lamps:Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array),
              calls:SILVER_GAME.refs.renderer.info.render.calls,triangles:SILVER_GAME.refs.renderer.info.render.triangles,
              canvasWidth:SILVER_GAME.refs.renderer.domElement.width,scrollWidth:document.documentElement.scrollWidth})''')
            assert state['phase'] == 'play' and state['lamps'] > 0.5, (width, quality, state)
            assert state['scrollWidth'] <= width, (width, state)
            page.screenshot(path=str(out / f'{width}x844-{quality}.png'))
            rows.append({'width': width, **state})
        assert not errors, errors
        page.close()
    browser.close()

target = out / 'quality-results.json'
target.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps(rows, ensure_ascii=False))
