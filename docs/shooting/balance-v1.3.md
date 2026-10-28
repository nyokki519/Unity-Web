# Shooting balance 1.3.0

Late run upgrades now have diminishing positive increments: P keeps +11 percentage points through level 4, then adds +2.5 per level through level 8 (143% instead of 177% base damage). S keeps +12 points for the first two tiers, then adds +4 through tier 5 (136% instead of 160% firing speed). Base and the tested mid build are unchanged. No enemy HP, pickup probabilities, visible shot counts, radii, orbit guns, side lanes, options, or auxiliary weapons changed. All P/S pickups still improve their own attack; no stack-wide penalty was introduced. Existing width budgets stay unchanged.

Feedback percentages use the same powerScale/rapidScale functions as combat, and the item descriptions disclose the later increments. Replay revision is 1.3.0: existing exact-version validation rejects 1.2.0 recordings while preserving progression saves. New recordings use GAME_VERSION automatically.

## Method and limits

Baseline: a copy of public/shooting at HEAD 8754eec, before edits, stored at /tmp/shooting-v120-baseline. Commands: `node tools/shooting-balance-probe.mjs [source-directory]` and `node tools/shooting-boss-probe.mjs [source-directory]`. Both support the optional baseline directory. The boss probe now covers all 20 weapons and permanent/fused support stress cases.

DPS is damage over 20 seconds against an invulnerable radius-55 target. Main/support positioning, travel, energy starvation and attack geometry affect it. Weapon 14's target is closer because it is a short-range saber. Boss times track the moving stage-0 normal boss with invulnerability and automatic horizontal aim; timeout is 90 seconds. No bombs, special or manually triggered overdrive. These are controlled combat comparisons, not player clear rates, whole-campaign balance, or evidence of subjective fun. Strong builds remain strong; this is a modest late scaling change, not a weapon redesign.

Builds: base is initial state; mid is P4/S2/W1/O2/L1/M1; full is P8/S5/W3/O3/L3/M3; all adds caliber3/ricochet3/orbit3. Permanent uses all plus power5/energy5, weapon development5 and support development5. Fusion additionally enables the earned fused support damage flag with all three options (the weapon-19 row also exercises the fusion main weapon).

## DPS, before → after

| Weapon | Base | Mid | Full | All | All reduction |
|---|---:|---:|---:|---:|---:|
| 0 | 60.05 → 60.05 | 271.81 → 271.81 | 695.88 → 504.84 | 705.58 → 514.54 | 27.1% |
| 1 | 72.05 → 72.05 | 114.25 → 114.25 | 171.34 → 134.43 | 181.04 → 144.13 | 20.4% |
| 2 | 49.4 → 49.4 | 95.25 → 95.25 | 156.12 → 126.89 | 165.82 → 136.59 | 17.6% |
| 3 | 120.35 → 120.35 | 199.95 → 199.95 | 304.82 → 233.6 | 314.53 → 243.31 | 22.6% |
| 4 | 72.75 → 72.75 | 122.33 → 122.33 | 160.8 → 134.99 | 170.5 → 144.69 | 15.1% |
| 5 | 101.45 → 101.45 | 183.74 → 183.74 | 294.06 → 222.62 | 303.76 → 232.32 | 23.5% |
| 6 | 61.25 → 61.25 | 108.13 → 108.13 | 162.31 → 131.33 | 172.87 → 141.04 | 18.4% |
| 7 | 54.41 → 54.41 | 94.98 → 94.98 | 134.03 → 111.44 | 143.73 → 121.14 | 15.7% |
| 8 | 55.55 → 55.55 | 99.93 → 99.93 | 146.78 → 120.11 | 156.48 → 129.81 | 17.0% |
| 9 | 34.33 → 34.33 | 66.88 → 66.88 | 95.6 → 84.47 | 105.31 → 94.17 | 10.6% |
| 10 | 46.85 → 46.85 | 86.33 → 86.33 | 129.54 → 106.98 | 139.24 → 116.69 | 16.2% |
| 11 | 13.25 → 13.25 | 37.2 → 37.2 | 65.2 → 61.04 | 74.9 → 70.74 | 5.6% |
| 12 | 62.65 → 62.65 | 109.56 → 109.56 | 162.87 → 128.6 | 172.57 → 138.3 | 19.9% |
| 13 | 85.25 → 85.25 | 150.84 → 150.84 | 228.97 → 177.03 | 238.67 → 186.73 | 21.8% |
| 14 | 67.83 → 67.83 | 127.15 → 127.15 | 195.47 → 155.55 | 215.13 → 175.2 | 18.6% |
| 15 | 39.5 → 39.5 | 74.52 → 74.52 | 108.79 → 92.84 | 118.49 → 102.88 | 13.2% |
| 16 | 60.29 → 60.29 | 93.4 → 93.4 | 119.67 → 108.25 | 129.37 → 117.95 | 8.8% |
| 17 | 130.25 → 130.25 | 221.55 → 221.55 | 289.12 → 241.95 | 298.83 → 251.65 | 15.8% |
| 18 | 46.51 → 46.51 | 90.31 → 90.31 | 140.76 → 118.9 | 150.46 → 128.6 | 14.5% |
| 19 | 105.86 → 105.86 | 179.58 → 179.58 | 274.55 → 207.84 | 284.25 → 217.54 | 23.5% |

The main shot weapon falls from 705.58 to 514.54 DPS (27.1%). Weapons relying heavily on unchanged auxiliary/support damage fall less (minimum 5.6%); weakening those further would also weaken upgrades outside the late P/S stack. All measured base/mid DPS values are identical before/after.

## Boss seconds, before → after

| Weapon | Base | Mid | All | Permanent | Fusion |
|---|---:|---:|---:|---:|---:|
| 0 | 30.150 → 30.150 | 7.025 → 7.025 | 3.092 → 3.983 | 2.433 → 3.100 | 2.333 → 2.917 |
| 1 | 25.067 → 25.067 | 15.808 → 15.808 | 9.892 → 12.325 | 7.133 → 8.808 | 6.000 → 7.117 |
| 2 | 46.683 → 46.683 | 23.375 → 23.375 | 13.400 → 15.900 | 9.442 → 10.875 | 7.508 → 8.333 |
| 3 | 15.167 → 15.167 | 9.292 → 9.292 | 5.925 → 7.508 | 4.458 → 5.475 | 4.092 → 4.925 |
| 4 | 24.925 → 24.925 | 14.725 → 14.725 | 9.608 → 11.808 | 6.858 → 8.433 | 5.825 → 6.792 |
| 5 | 17.983 → 17.983 | 10.058 → 10.058 | 5.775 → 7.592 | 4.392 → 5.625 | 3.700 → 5.142 |
| 6 | 29.708 → 29.708 | 16.750 → 16.750 | 10.450 → 12.683 | 7.625 → 9.075 | 6.375 → 7.367 |
| 7 | 37.342 → 37.342 | 20.650 → 20.650 | 13.592 → 16.192 | 9.658 → 10.875 | 7.600 → 8.433 |
| 8 | 32.167 → 32.167 | 17.933 → 17.933 | 11.442 → 13.950 | 8.333 → 9.733 | 6.858 → 7.867 |
| 9 | 53.633 → 53.633 | 26.875 → 26.875 | 16.967 → 19.100 | 11.467 → 12.933 | 8.800 → 9.400 |
| 10 | 38.575 → 38.575 | 20.542 → 20.542 | 12.650 → 15.333 | 9.058 → 10.617 | 7.250 → 8.333 |
| 11 | 90.000 → 90.000 (timeout) | 42.233 → 42.233 | 22.792 → 24.025 | 17.083 → 17.358 | 10.900 → 11.133 |
| 12 | 28.925 → 28.925 | 16.550 → 16.550 | 10.333 → 12.958 | 7.467 → 9.125 | 6.217 → 7.308 |
| 13 | 26.150 → 26.150 | 14.750 → 14.750 | 9.008 → 10.967 | 6.408 → 8.033 | 5.475 → 6.525 |
| 14 | 90.000 → 90.000 (timeout) | 50.025 → 50.025 | 26.158 → 26.158 | 18.100 → 18.100 | 11.400 → 11.400 |
| 15 | 43.358 → 43.358 | 23.442 → 23.442 | 14.775 → 17.300 | 10.217 → 11.675 | 8.075 → 8.892 |
| 16 | 48.058 → 48.058 | 28.292 → 28.292 | 18.600 → 19.500 | 11.975 → 12.825 | 8.283 → 8.808 |
| 17 | 14.400 → 14.400 | 8.592 → 8.592 | 5.708 → 7.142 | 4.300 → 5.233 | 3.917 → 4.683 |
| 18 | 40.183 → 40.183 | 19.842 → 19.842 | 11.442 → 13.600 | 7.600 → 9.008 | 6.333 → 7.250 |
| 19 | 17.300 → 17.300 | 10.083 → 10.083 | 6.583 → 8.442 | 4.925 → 6.050 | 4.425 → 5.442 |

Main weapon all-upgrade boss time rises from 3.092 to 3.983 seconds (+28.8%), while its base remains 30.150 and mid remains 7.025 seconds.

Fastest all clear: weapon 0, 3.092 → 3.983 seconds.

Fastest permanent clear: weapon 0, 2.433 → 3.100 seconds.

Fastest fusion clear: weapon 0, 2.333 → 2.917 seconds.

Some low-coverage weapons can reach the 90-second boss timeout; this patch does not try to equalize every weapon or solve tracking/range weaknesses. Permanent power and fused options can still shorten the fight substantially; they remain earned benefits rather than being cancelled by hidden scaling. The unchanged support/auxiliary floor limits the reduction of these cases.

## Verification

`node --test test/shooting*.test.js`: 60 passing, 0 failing. Added tests cover early unchanged and later positive increments, actual late main damage/cadence, lane retention and honest late pickup percentages. Current replay round-trip and rejection of old 1.2.0 replays pass. Existing deterministic simulation and all-weapon combat tests pass. Full repository regression/browser verification is delegated to the parent task to avoid competing with its baccarat browser work.

## Parent integration verification

Full repository Node suite:392 passing,0 failing. Independent rerun of80 DPS cases matched the recorded results. Browser actual collect() path reaches level8/S5/width3/options3/fused weapon19, reports power1.43/rapid1.36, leaves enemy maxHp unchanged and does not overwrite the progression save.375/390/414px screenshots and raw before/after measurements are under [qa/balance-v1.3/](qa/balance-v1.3/). Legacy Unity MIX, Chinchiro, Retro and Shooting quickstart regressions pass. Physical iPhone and subjective human difficulty remain unverified.
