# Unity MIX ラテアート手ほどきデモ

## Reference review

Reviewed `https://caen.games/latteart-maker` in a 390×844 mobile browser on 2026-11-18. The visible interaction is a full-viewport 3D scene on a wood tabletop: an espresso cup, a milk pitcher, a vertical pour lever on the left, touch/mouse positioning over the cup, a brief instruction overlay, and audio/device controls. The source page metadata describes controlling pour position and pitcher tilt; the interactive page keeps most controls in WebGL/canvas, so the DOM text exposed by automation is limited.

## Unity MIX adaptation

- Retains the 3D tabletop, cup and pitcher composition, vertical pour control, drag-to-position, brief per-stage help, and mobile-first full-screen scene.
- Adds a separate chocolate-pen stage because the intended community demonstration teaches design latte art after the milk base is made.
- Includes short explanations for espresso, microfoam, outline-first drawing, and differences between this simplified simulation and real milk/chocolate behavior.
- Does not add score, ranking, opponents, rewards, or challenge modes.
- The 3D liquid is a visual approximation; it does not solve fluid dynamics or teach food-safety/steaming temperatures.
- No reference site code or image assets are included in this first implementation.

## Verification

Chromium: 390×844 mobile emulation and 1280×800 desktop. Checked pour control, drag position, projected drawing surface alignment, pointer drawing, finish and restart. No page errors, horizontal overflow, or missing app resources. Screenshots are in `docs/qa/latte-art/`.
