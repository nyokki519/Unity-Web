# 推奨実装アーキテクチャ
- 既存Unity MIXのJACKPOTモジュールを特定。別ゲームや共有ルーティングを保護。
- 2D釘盤面：Matter.js等（既存技術優先、必要なら置換）
- 3Dクルーン：Three.js + Rapier等。ライブラリは候補であり採用前に試験。
- `BallState` と `BallId` による唯一の所有者を設ける。
- `Launcher` → `Rail` → `Board` → `Gate` → `Cradle1` → `Cradle2` → `Cradle3` → `Out/Jackpot`。
- 描画と当落判定を分離。物理判定を描画演出で上書きしない。
- デバッグ表示：コライダー、接触法線、速度、球ID、現在状態、シード、時間刻み。
- 通常/研究/リプレイ/高速試行モード。近似シミュレーションは完全物理と区別。
- パラメータJSONに source, confidence, measuredOrEstimated を持たせる。
