"""Regression check for presentation-only cabinet work (Chromium mobile emulation)."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

base = os.environ.get('UNITY_RETRO_URL', 'http://127.0.0.1:8765/silver-ring/index.html')
out = Path(os.environ.get('SILVER_CABINET_QA_DIR', 'docs/qa/retro-cabinet-lamps/final'))
out.mkdir(parents=True, exist_ok=True)
rows = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for w, h in [(375, 844), (390, 844), (414, 844)]:
        page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=True, is_mobile=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def on_response(response):
            if response.status >= 400 and not response.url.endswith('/favicon.ico'):
                errors.append(f'{response.status} {response.url}')
        page.on('response', on_response)
        page.goto(base, wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
        page.locator('#btnStart').click()
        page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
        page.evaluate("SILVER_GAME.S.manualCamera = 'wide'")
        page.wait_for_function("() => SILVER_GAME.fx.camMode === 'WIDE'")
        page.wait_for_timeout(1000)
        initial = page.evaluate('''() => ({
          boardChildren: SILVER_GAME.refs.boardG.children.length,
          lampCount: SILVER_GAME.refs.cabinetLampN,
          renderCalls: SILVER_GAME.refs.renderer.info.render.calls,
          triangles: SILVER_GAME.refs.renderer.info.render.triangles,
          canvas: [SILVER_GAME.refs.renderer.domElement.width, SILVER_GAME.refs.renderer.domElement.height],
          phase: SILVER_GAME.S.phase,
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth
        })''')
        assert initial['boardChildren'] == 54, initial
        assert initial['lampCount'] == 18, initial
        assert initial['scrollWidth'] <= w, initial
        assert initial['renderCalls'] <= 210, initial
        assert initial['triangles'] <= 170000, initial
        idle_max = page.evaluate('Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array)')
        idle_glow_max = page.evaluate('Math.max(...SILVER_GAME.refs.cabinetLampGlow.instanceColor.array)')
        idle_bulb_palette = page.evaluate('''() => {
          const c = SILVER_GAME.refs.bulbIM.instanceColor.array;
          return Math.max(...Array.from({length:SILVER_GAME.refs.bulbN}, (_, i) => c[i*3+1] - c[i*3]));
        }''')
        idle_line_palette = page.evaluate('''() => Math.max(...SILVER_GAME.refs.neonMats.map(m => m.color.g - m.color.r))''')
        page.screenshot(path=str(out / f'{w}x{h}-idle.png'))

        # Tier 2 reads farther along the rail path than tier 0 without touching game state.
        tier_paths = page.evaluate('''async () => {
          const {sampleCabinetLampState} = await import('./src/cabinet-lamp-state.js');
          const a = sampleCabinetLampState({pulse:{kind:'bowl',tier:0,age:.2}});
          const b = sampleCabinetLampState({pulse:{kind:'bowl',tier:2,age:.2}});
          const miss = sampleCabinetLampState({pulse:{kind:'sink',tier:1,win:false,age:.2}});
          return {first:a.chase, final:b.chase, firstLevel:a.level, finalLevel:b.level, miss:miss.color};
        }''')
        assert tier_paths['final'] != tier_paths['first'], tier_paths
        assert tier_paths['finalLevel'] > tier_paths['firstLevel'], tier_paths
        assert tier_paths['miss'] == 'amber', tier_paths
        priority = page.evaluate('''() => {
          const jackpot = {kind:'jackpot',tier:2,win:true,age:.3};
          SILVER_GAME.fx.pulseCabinet('jackpot',2,true);
          SILVER_GAME.fx.pulseCabinet('gate');
          return SILVER_GAME.fx.cabinetPulse?.kind;
        }''')
        assert priority == 'jackpot', priority
        page.evaluate('SILVER_GAME.fx.clearCabinetPulse()')

        page.evaluate('SILVER_GAME.toBowl(1)')
        pulse = page.evaluate('SILVER_GAME.fx.cabinetPulse?.kind')
        assert pulse == 'bowl', pulse
        page.wait_for_function('Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array) > 0.5', timeout=15000)
        event_max = page.evaluate('Math.max(...SILVER_GAME.refs.cabinetLampIM.instanceColor.array)')
        event_glow_max = page.evaluate('Math.max(...SILVER_GAME.refs.cabinetLampGlow.instanceColor.array)')
        event_bulb_palette = page.evaluate('''() => {
          const c = SILVER_GAME.refs.bulbIM.instanceColor.array;
          return Math.max(...Array.from({length:SILVER_GAME.refs.bulbN}, (_, i) => c[i*3+1] - c[i*3]));
        }''')
        event_line_palette = page.evaluate('''() => Math.max(...SILVER_GAME.refs.neonMats.map(m => m.color.g - m.color.r))''')
        assert event_max > idle_max + 0.2, (idle_max, event_max)
        assert event_glow_max > idle_glow_max + 0.08, (idle_glow_max, event_glow_max)
        assert event_bulb_palette > idle_bulb_palette + 0.2, (idle_bulb_palette, event_bulb_palette)
        assert event_line_palette > idle_line_palette + 0.2, (idle_line_palette, event_line_palette)
        page.screenshot(path=str(out / f'{w}x{h}-event.png'))

        page.evaluate("SILVER_GAME.S.manualCamera = 'wide'; SILVER_GAME.S.jackpotLock = true; SILVER_GAME.fx.jackpotOn = true; SILVER_GAME.fx.setNeonMode('jackpot'); SILVER_GAME.fx.pulseCabinet('jackpot', 2, true)")
        page.wait_for_function("() => SILVER_GAME.fx.neonMode === 'jackpot'", timeout=10000)
        page.screenshot(path=str(out / f'{w}x{h}-jackpot.png'))
        page.evaluate("parent.postMessage({source:'silver-shell', type:'motion', value:true}, location.origin)")
        page.wait_for_function("() => SILVER_GAME.S.reduce && document.body.classList.contains('reduced')")
        page.evaluate("SILVER_GAME.fx.pulseCabinet('gate')")
        # Wait for an actual reduced-motion lamp upload, not a stale pulse age from the jackpot.
        page.wait_for_function("() => SILVER_GAME.fx._cabinetLampSignature === 'champagne:0.72:-1'")
        page.wait_for_timeout(250)
        reduced_lights_a = page.evaluate('Array.from(SILVER_GAME.refs.cabinetLampIM.instanceColor.array)')
        reduced_glow_a = page.evaluate('Array.from(SILVER_GAME.refs.cabinetLampGlow.instanceColor.array)')
        reduced_marquee_a = page.evaluate('Array.from(SILVER_GAME.refs.bulbIM.instanceColor.array)')
        reduced_lines_a = page.evaluate('SILVER_GAME.refs.neonMats.map(m => m.color.toArray())')
        assert page.evaluate("""async () => {
          const {sampleCabinetLampState} = await import('./src/cabinet-lamp-state.js');
          const a = sampleCabinetLampState({time: 2, mode:'jackpot', pulse:{kind:'jackpot',tier:2,age:.1}, reduced:true});
          const b = sampleCabinetLampState({time: 8, mode:'jackpot', pulse:{kind:'jackpot',tier:2,age:.1}, reduced:true});
          return a.level === b.level && a.chase === -1;
        }""")
        page.wait_for_function('() => SILVER_GAME.fx.cabinetPulse?.age > 0.3')
        reduced_lights_b = page.evaluate('Array.from(SILVER_GAME.refs.cabinetLampIM.instanceColor.array)')
        reduced_glow_b = page.evaluate('Array.from(SILVER_GAME.refs.cabinetLampGlow.instanceColor.array)')
        reduced_marquee_b = page.evaluate('Array.from(SILVER_GAME.refs.bulbIM.instanceColor.array)')
        reduced_lines_b = page.evaluate('SILVER_GAME.refs.neonMats.map(m => m.color.toArray())')
        if reduced_lights_a != reduced_lights_b:
            changed = [(i, round(a, 4), round(b, 4)) for i, (a, b) in enumerate(zip(reduced_lights_a, reduced_lights_b)) if a != b]
            raise AssertionError(f'reduced-motion cabinet lamps changed between frames: {changed[:12]} state={page.evaluate("({mode:SILVER_GAME.fx.neonMode,pulse:SILVER_GAME.fx.cabinetPulse,reduced:SILVER_GAME.S.reduce})")!r}')
        assert reduced_marquee_a == reduced_marquee_b, 'reduced-motion marquee lamps changed between frames'
        assert reduced_glow_a == reduced_glow_b, 'reduced-motion lamp glow changed between frames'
        assert reduced_lines_a == reduced_lines_b, 'reduced-motion light bars changed between frames'
        page.screenshot(path=str(out / f'{w}x{h}-reduced.png'))
        page.evaluate('SILVER_GAME.fx.jackpotOn = false; SILVER_GAME.S.jackpotLock = false; SILVER_GAME.fx.setNeonMode("idle")')

        page.keyboard.press('p')
        page.wait_for_function("() => SILVER_GAME.S.phase === 'paused'")
        assert page.evaluate('SILVER_GAME.fx.cabinetPulse') is None
        page.locator('#resumeGame').click()
        page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
        page.locator('#singleShot').click()
        assert page.evaluate('SILVER_GAME.S.fired') == 1
        assert page.evaluate('SILVER_GAME.S.funds') == 49800
        assert not errors, errors
        rows.append({**initial, 'eventLamp': pulse, 'idleMaxLampColor': idle_max, 'eventMaxLampColor': event_max, 'idleGlowMax': idle_glow_max, 'eventGlowMax': event_glow_max, 'idleMarqueePalette': idle_bulb_palette, 'eventMarqueePalette': event_bulb_palette, 'idleLinePalette': idle_line_palette, 'eventLinePalette': event_line_palette, 'tierChaseAndMissPalette': True, 'priorityPulse': priority, 'jackpotModePersists': True, 'reducedMotionStatic': True, 'pauseClearsPulse': True, 'singleShot': 1, 'errors': errors})
        page.close()
    for w, h in [(375, 667), (844, 390)]:
        page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=True, is_mobile=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base, wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SILVER_GAME', timeout=60000)
        page.locator('#btnStart').click()
        page.wait_for_function("() => SILVER_GAME.S.phase === 'play'")
        page.evaluate("SILVER_GAME.S.manualCamera = 'wide'")
        page.wait_for_timeout(800)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('#singleShot').is_visible()
        if w > h:
            page.locator('#mCam').click()
            assert page.locator('#mCam').get_attribute('aria-pressed') == 'true'
        page.screenshot(path=str(out / f'{w}x{h}-fit.png'))
        assert not errors, errors
        rows.append({'width': w, 'height': h, 'controlsVisible': True, 'scrollWidth': w, 'errors': errors})
        page.close()
    browser.close()

(out / 'browser-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
print(json.dumps(rows, ensure_ascii=False))
