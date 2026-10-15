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
