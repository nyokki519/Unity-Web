# Stage design

| Sector | Environment | Boss | Focus |
|---|---|---|---|
| 0 緑光都市 | Green city skyline | 軌道殻ミドリ | Aimed fire and formation reading |
| 1 残響工廠 | Industrial factory | 硝子鰭ハク | Crossing lanes and precision |
| 2 天空要塞 | Sky fortress | 炉心城クロガネ | Armor, turrets and part priority |
| 3 星海戦線 | Space | 雲龍シデン | Rotating pressure and movement |
| 4 暁の中枢 | Central machinery | 暁核アカツキ | Combined learned patterns |
| 5 零番航路 | Hidden orbit | 零星ムメイ | Optional high-pressure mastery |

Each stage record includes two background colors, enemy and pattern offsets, encounter names and timing. Early waves should leave time to recognize silhouettes. After the midboss, pattern combinations intensify while preserving safe entry space. Boss warnings must appear before attack begins. The player continues through explicit stage-clear navigation, with enough time to inspect rewards and choose the next action.

Secret route access follows a recorded campaign clear at stage 4 or later. Stage availability is persistence state, while selected-mode start restrictions belong in UI/core. A selected unlocked stage must correspond to an actual numeric stage rather than display-only progression. Background decoration is procedural and must not mask bullets or suggest collisions that do not exist.

All six stage records schedule midboss at65 and main boss at175 seconds. Boss-fight duration extends the stage toward the intended 3–5-minute range; simulation and clear-time measurements remain authoritative.
