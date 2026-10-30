# Casino table refinement

Owned changes: public/baccarat/salon-shell.js and salon.css only; no commits or financial/controller changes.

Restored a recognizably casino-green cloth (#176331 / #104623 with restrained weave), bright nested brass/gold rails, large arched SVG UNITY BACCARAT title and flourishes, curved gold payout legend, and three arched double-outline gold betting areas. Player/Banker field geometry follows their columns; Tie uses a rounder smaller arch. Title now has emerald spotlight cloth, bright double rail and restrained italic display initial. All prior responsive structure, community art, 44px controls, selectors and desktop history remain.

Validation: node --check salon-shell.js passed. Fresh isolated browser render using actual shell/CSS/card modules with six actual atlas cards at375/390/414/1440. No horizontal overflow, all visible game controls >=44px in BOTHdimensions, no page/module errors. Fresh screenshots `/tmp/salon-casino-title-{375,390,414,1440}.png` and `/tmp/salon-casino-game-{375,390,414,1440}.png`. Inspected mobile375/390/414 six-card views and PC1440 title/game; no label overlap. Harness /tmp/salon-casino-check.py. No source baked-coordinate reference image used. Root should capture integrated gameplay state for release evidence; harness checks presentation with true rendering modules, not session behavior.
