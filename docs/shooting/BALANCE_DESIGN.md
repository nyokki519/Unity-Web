# Balance and economy

Starter ownership is ship IDs 0–2, weapon IDs 0–2 and support ID 0. Additional ship prices run from 1,800 to 10,000 credits. Weapon costs use 650 + 390×ID; support costs use 800 + 450×ID. Prices are resolved from catalog data; callers cannot supply a discounted price or free ID.

Per-result base currency is floor(scoreDelta/500) + 2×min(kills,500) + 500 for a clear, capped at 2,500. Practice has no currency or material payout. Observed lifetime milestone achievements add one-time rewards of 75–300 credits each. Duplicate run IDs yield neither counters nor currency. This is an initial progression curve, not a claim of statistically tuned retention or average clear time.

Upgrade levels 1–5 cost 500/1,200/2,400/4,200/6,800 credits and 2/5/8/11/14 common material. Max level is five. Credit and material counters are finite, nonnegative and capped. Results accept at most 100 common and 20 of each higher-grade material per recording. Individual weapon/support development spends uncommon, rare and epic materials; secret equipment purchases also spend rare, epic or legendary material.

Four difficulties scale projectile speed, density, enemy health, fire rate and reward independently. Precision/survival must be checked at fixed simulation speed. Score/daily use normalized equipment, preventing permanent upgrades from defining local competitive results. Local rankings remain grouped/labeled by mode and difficulty in the UI.

One hundred milestones span runs, kills, graze, clears, parts, items, cumulative score, peak combo, duration and completed stages. Each unlock references its real statistic and numeric threshold; no online percentiles or fabricated player counts are used. Miss count is recorded but is not rewarded as mastery. Future balance work should measure weapon aggregate DPS, damage taken, material yield and sector clear rates before changing costs.

Secret ownership requires the campaign-final clear flag: ship7 additionally costs one rare, support14 one epic, and weapon19 one legendary material. This makes each material tier usable without adding a separate currency. Legendary material is earned from the hidden boss in core.

Individual equipment development follows the weapon-design price table and validates finite integer funds/materials. Stage result scoreDelta prevents earlier-stage score from being paid repeatedly; rankings keep the full score. Boss entry moved to175 seconds to protect the intended stage length even with strong equipment. Root will rerun seeded balance checks after integration.
