# Baseline review evidence

All production captures here were made in the current audit run with Chromium emulating 390×844 px and touch enabled. Two isolated browser contexts were used for real-time rooms. This is browser emulation, not a physical iPhone test.

| Step | Production state | Health | Evidence and verified observation |
|---|---|---|---|
| 1 | Unity MIX home | Good | `01-home-live-390.png`: three headline room actions remain clear; long landing page is vertically scrollable. |
| 2 | Mahjong character selection | Good | `02-mahjong-live-390.png`: four portraits fit a 2×2 grid; no visible browser error. |
| 3 | Mahjong CPU first turn | Needs polish | `04-mahjong-cpu-turn-390.png`: board is legible, but each opponent uses five tiny `▥` text glyphs despite a 13-tile count. Audio button is visible; source confirms no audio playback path. |
| 4 | Event room setup/lobby | Good | `05-room-create-390.png`, `06-rating-lobby-390.png`, `07-rating-ready-390.png`: host and guest successfully join and ready a real ephemeral room. |
| 5 | Rating answer and A/B rooms | Good / content concern | `09-rating-answer-390.png`, `10-rating-closed-390.png`: both players answer; A/B names and counts sync. The active pool is dominated by original practice art, not evidence-backed professional appraisal. |
| 6 | Rating synchronized reveal | Needs repair | `15-rating-reveal-baseline-t0250.png`, `...t2150.png`, `...t3550.png`: both browser contexts show identical beats, but both doors have the same animation and open together. Source also subtracts the future end time as though it were a start time, so reconnect cannot resume at the correct beat. |
| 7 | Tier instructions and board | Good / friction | `12-tier-rules-live-390.png`, `13-tier-answer-live-390.png`: board is operable at 390px; tap-to-place exists but the primary copy leads with dragging. Default timer is 600 seconds and the screen says “締切まで 600秒.” |
| 8 | Tier result/share semantics | Needs repair | Source review: the result heading says “みんなの真ん中” while showing plurality; share-image generation receives no theme prompt, so a saved image loses its topic. |

Source-only findings above are not represented as direct browser observations unless stated. No physical iPhone or Safari was available. Capture files are kept in this folder and were opened for inspection before acceptance.
