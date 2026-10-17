> 現行SI-4の仕様は末尾と `docs/qa/jackpot-rebuild/README.md` を参照。以下は初期モデルからの履歴。

> 以下の初期モデル仕様は履歴。旧SI-3の単位はm/s/kg、球半径.0055m、質量.0055kg、109本の釘、固定3D皿。`JACKPOT_REDESIGN.md` / `JACKPOT_FLOW_FIX.md` / `docs/qa/jackpot-camera/REFERENCE.md` を併読する。

# PROJECT ABYSS

ユーザー提供の開発指示書（2026-10-15）を今回の仕様とする。既存Unity MIXの交流ゲーム・CPU・サーバーは変更しない。`feat/jackpot-realism` の未コミット変更を引き継ぐ。

## 技術判断

既存はビルド不要のES Modules + Node。アプリ全体のReact/Vite化はルーム画面へ不要な影響があるため行わない。物理は固定240Hzの専用モデル（スイープ衝突・摩擦・回転・球同士の接触）、描画はThree.jsの立体筐体とする。Matter.jsだけでは回転皿の傾斜・落下を解決できず二重の時間管理になるため採用しない。型の境界はJSDocと設定検証、テストは既存Node testとPlaywrightを再利用する。追加の有料サービスや外部アセットは不要。

## モジュール契約

`public/js/abyss/config.js`: WIDTH=1000, HEIGHT=1600, FIXED_DT=1/240, BALL_RADIUS=5.5。`createBoard(difficulty, overrides)` はJSON保存可能な盤面を返す。`holesAt(tray,time)` は回転を反映した穴を返す。穴は `{id,x,y,r,win}`。

`engine.js`: `createSimulation({difficulty='easy',seed='abyss',initialBalls=100,config,debug=false})`。返り値は `board,balls,events,status,elapsed,tick,remaining,fired,lost,jackpots,score,passes[3],stats,inputs` と `fire(power,angle),step(seconds),pause(),resume(),end(),debugDrop(stage,{outcome}),debugEmpty(),snapshot()`。statusはrunning/paused/finished。ballsは `{id,zone:'board'|'gate'|'tray'|'transfer'|'fall',stage:0..3,x,y,vx,vy,r,renderX,renderY,renderZ}`。皿のx/yは皿中心からの局所座標。他は盤面座標。描画座標は物理側で一意に計算する。eventsは `{id,type,stage,at,x?,y?,energy?}` の有界リング。ボール台帳 fired=lost+jackpots+balls.length を維持する。

`renderer.js`: `createRenderer(canvas,board)` → `{render(game,{quality,reducedMotion,camera,heatmap}),resize(),dispose(),mode}`。WebGL不可は明示したCanvasフォールバック。回転穴・球位置は物理と同じ計算を使う。

`analysis.js`, `storage.js`, `research-worker.js`: Wilson区間、条件付き統計、スキーマ検証、IndexedDB、JSON/CSV、物理試行と明示した近似試行、シード入力リプレイ。

`screen.js`, `audio.js`, `abyss.css`: 画面・音・設定。既存 `bonus/screen.js` のmountBonus契約を保つ薄い入口から呼ぶ。破棄時にrAF、Worker、イベント、WebGL、音声を解放する。

## 盤面と安全性

300本の設計された非均一格子の釘、右側発射通路、狭い入口、周期ゲート、回転する3段皿。成功は位置と接触から決め、隠れた当落抽選は行わない。皿の目標突破率は保証しない。資料の1/30,000モデルは近似解析の前提としてのみ表示する。通常プレイへそのまま強制しない。

## 検証

トンネリング、回転穴、ゲート、球同士、台帳、決定論、保存検証、統計分母をNodeで検証。ブラウザ375/390/414px、複数球、停止、リサイズ、保存・復元、リプレイ、研究の停止／再開を確認する。物理iPhone SafariとGPU性能は実機未確認として区別する。

## SI-3での追加契約

`board.physicsVersion='si-3'`、皿の`profile='curved'`は放物面を表す。`si-geometry.js`のbowlHeightとbowlMeshを衝突・描画で共有し、描画の法線と接地影も同じ曲面から計算する。既存のcreateSimulation外形、固定240Hz、台帳、dispose契約は維持する。`replay.js`はversion1をlegacy、version2のphysicsVersionでsi-v1/si-v2/現行を選ぶ。

`presentation.js`は物理状態を変更せず、自動カメラの段選択・保持と画面密度の方針を担当する。rendererの`getViewState()`は表示状態の確認用。

## SI-4: LANTERNAを参考にした独自盤面

現行は`physicsVersion='si-4'`。`board-routes.js`が道釘・こぼし・散らし等177本と支持路、`tray-layout.js`が傾斜した環状の谷と3段の穴・移送路を生成する。配置・摩擦は未実測の独自設計。`orbital-mesh.js`の極座標メッシュと開口を衝突・描画で共有する。穴の縁も同じ高さ関数に沿わせる。固定240HzのRapier接触で判定し、当落を決める後付け乱数や玉の誘導はない。

`cabinet.js`は手続き生成の筐体と装飾のみを所有する。`play-layout.js`は既存の操作を移動し、盤面・発射欄を分離、詳細設定を折り畳む。横向きの低い画面では盤面と操作を2列にする。

旧SI-3の物理・描画は`si-v3/`へ凍結し、記録のphysicsVersionで切り替える。SI-4の玉数上限による発射拒否は乱数を消費しないため、未記録の失敗操作で再生が変わらない。検証・限界は`docs/qa/jackpot-rebuild/README.md`。

## 2026-10-17: 銀環とSI-5の分離

既定のおまけは `public/silver-ring/` の許諾済み参考コードを改変した「喫茶・銀環」。Three描画、平面衝突＋解析的皿運動と段間移送を使用する。[技術・比較・権利・検証](../boqingge-study/IMPLEMENTATION.md)を参照。旧SIモデルは `physics=1` で残す。SI-5では可動回転コライダー、警戒度つき傾き操作、型付き傾き記録を追加。SI-4は `si-v4/` に凍結し既存記録を再生する。モード間の物理単位・実測を混用しない。
