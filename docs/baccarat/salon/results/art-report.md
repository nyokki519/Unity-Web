# Salon art / audio implementation

- `public/baccarat/salon-art.js`: `chipArt(value)` returns a module-relative static asset URL for 1, 10, 100, 500, 1000, 5000; safely encoded generic SVG URL for other values. Optional `createChip(value)` returns an accessible image.
- `public/baccarat/salon-assets/chip-*.svg`: six independent original detailed vectors with twelve edge inserts, lower sidewall/reeding, circular beadwork, foil rings, denominations, highlight and community cup/heart. Embedded actual `public/assets/unity-mark.webp` receives a luminance-derived alpha mask to eliminate its rectangular paper background. No source-reference art, fonts or SE.
- `salon-assets/felt-weave.svg`: original repeating emerald woven cloth, 64px tile.
- `salon-assets/salon-medallion.svg`: community cup/heart circular brass medallion.
- `public/baccarat/salon-audio.js`: exported `SalonAudio`; only constructs audio context after `unlock()`, three independently controlled buses, original soft sine-contact sound motifs and four suspended lounge voicings. Voice cap 24, repeated contacts throttled, every oscillator/gain disconnects when ended/stopped. Hidden tab suspends, visible tab resumes only existing context; dispose removes listener, timer, voices, buses and closes context. User muted/BGM0 avoids ambient timer.

Validation: `node --test test/baccarat-salon-art-audio.test.js`: 2/2 passed. Tests inspect all chip files and safe custom values; mock AudioContext verifies no autoplay construction, unlock, channel gains, capped contacts, pause/resume, muted ambient and idempotent disposal. Python CairoSVG is unavailable so SVG raster preview could not be performed here; browser integration should inspect chip masking and medallion. Sound timbre is mathematically restrained, but browser listening remains an integration check.

No financial/rules/storage files changed. Art paths communicated to shell worker. No commits.

## Title art follow-up
Added `title-ace.svg` (community FACES[13] master) and `title-back.svg` (BACK master with SALON naming), both 1000x1400 SVG presentation size. Existing masters unchanged. Added `community-mark.svg`, a transparent brass rendering of actual mark; exports `titleCardArt`, `titleBackArt`, `communityMarkArt`. Browser Chromium render inspected on navy at `/tmp/salon-art-inspect.png`: clean transparent mark, clear independent chip/face/back; no paper rectangle. Corrected filter region on all chip/medallion masks to avoid default SVG filter padding causing a fine rectangular edge. Tests rerun 2/2 pass.
