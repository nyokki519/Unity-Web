# Squeeze implementation

Implemented `salon-card.js`, `salon-squeeze.js`, and `salon-squeeze.css`. Uses the Unity classic atlas and a segmented Three.js plane with separate front/back textures, a draggable angled curl, light and shadow; the CSS fallback remains directly usable when WebGL fails. Pointer cancellation ends the gesture without ending the reveal. The explicit reveal button and keyboard activation complete it; reduced motion uses the CSS representation. The caller owns table inertness and focus trapping.

Validation: `python test/baccarat-salon-squeeze_browser.py` passed lifecycle, pointer drag, keyboard reveal, and blocked-WebGL fallback. `npm test` passed 413 tests. Inspected `/tmp/salon-squeeze-curl.png` at 45% curl with visible back and correctly oriented face. The browser test uses a temporary isolated DOM, not the integrated shell.

High-resolution update: the active squeeze now lazily loads the original SVG masters and rasterizes only the current face and back to 720×1000 textures, disposing both on close. Inline cards retain the atlas. Card accessibility labels are Japanese. The isolated browser test passed again with a texture-dimension assertion, drag, fallback, keyboard, and lifecycle checks. Inspected `/tmp/salon-squeeze-hidpi.png` at device scale 2 and 45% curl, including a court card.

Overlay update: viewer is now a centered fixed overlay with safe-area padding and scrolling, and the camera centers and fits the current sheet bounds. Renderer disposal explicitly releases its WebGL context. Isolated browser verification passed ten successive renderer openings and cancellations, plus lifecycle, drag, keyboard and fallback. At 375×667 the reveal button was visible at y=504–548; `/tmp/salon-squeeze-overlay.png` shows the overlay and folded card.
