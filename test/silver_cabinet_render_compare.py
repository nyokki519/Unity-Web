"""Measure matched baseline/current cabinet render timing in software Chromium."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

CASES = [
    ('main-a', 'http://127.0.0.1:8766/silver-ring/index.html'),
    ('cabinet-a', 'http://127.0.0.1:8765/silver-ring/index.html'),
    ('cabinet-b', 'http://127.0.0.1:8765/silver-ring/index.html'),
    ('main-b', 'http://127.0.0.1:8766/silver-ring/index.html'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    )
    results = []
    for name, url in CASES:
        page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
        page.locator('#btnStart').click()
        page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
        page.evaluate("SILVER_GAME.S.manualCamera='wide'")
        page.wait_for_function("() => SILVER_GAME.fx.camMode==='WIDE'")
        sample = page.evaluate('''async () => {
          const capture = async count => {
            const intervals=[]; let prev=0;
            await new Promise(resolve => {
              const tick = now => {
                if (prev) intervals.push(now-prev);
                prev=now;
                if (intervals.length >= count) resolve(); else requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            });
            return intervals;
          };
          await capture(20); // Warm shader caches and let the camera settle.
          const intervals=await capture(50);
          const sorted=[...intervals].sort((a,b)=>a-b);
          const percentile=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];
          const r=SILVER_GAME.refs.renderer;
          return {frames:intervals.length, medianFrameMs:percentile(.5), p95FrameMs:percentile(.95),
            renderCalls:r.info.render.calls, triangles:r.info.render.triangles,
            pixelRatio:r.getPixelRatio(), canvas:[r.domElement.width,r.domElement.height]};
        }''')
        assert not errors, errors
        results.append({'version': name, **sample, 'errors': errors})
        page.close()
    browser.close()

baseline = sorted([r['medianFrameMs'] for r in results if r['version'].startswith('main')])[1]
updated = sorted([r['medianFrameMs'] for r in results if r['version'].startswith('cabinet')])[1]
delta = (updated / baseline - 1) * 100
output = {'viewport': '390x844 CSS px', 'renderer': 'Chromium software WebGL (SwiftShader)', 'warmupFrames': 20, 'cases': results,
          'baselineMedianMs': baseline, 'updatedMedianMs': updated,
          'medianFrameDeltaPct': delta, 'physicalDeviceClaim': False}
target = Path('docs/qa/retro-cabinet-lamps/performance-rendering.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(output, ensure_ascii=False, indent=2))
print(json.dumps(output, ensure_ascii=False))
