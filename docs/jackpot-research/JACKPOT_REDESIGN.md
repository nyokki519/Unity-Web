> SI-2の詰まり・視認性修正は [JACKPOT_FLOW_FIX.md](JACKPOT_FLOW_FIX.md) を参照。以下はSI-1の初期設計記録であり、環状の谷を持つ皿はSI-2では使用しない。

# SI・3D接触版の改修設計

2026-10-15のオフラインパックを追加資料として採用する。パックは実測・画像ではなく、二次的な技術ノートである。実機の穴数や皿の回転を確認したとは扱わない。最新資料にある「未検証の仮パラメータを明示して進める」に従い、現物再現と称さないオリジナル機構として改修する。

## 根拠と仮設計

玉径0.011m、質量0.0055kgはパックの規格要約を採用（引用元は未直接閲覧）。g=9.80665m/s²は標準近似。その他の釘・皿・穴・流路・材質値はすべてE=ゲーム独自の仮設計。固定皿を既定とし、実機を回転皿と断定しない。

## モデル

Rapier3D0.21.0（CCD、有効な球質量、回転、静的三角形皿、キネマティックゲート）を互換性検証後に使用。x右、y上、z手前、すべてm、s、kg。重力y=-g。盤面とレールも同一3D世界で解き、段間で速度・位置を書き換えない。接触形状と描画は同じgeometryデータを使う。

物理APIはcreateSimulationの外形を維持。board.physicsVersion='si-1'、board.units='m-s-kg'。ballsはid,zone,stage,x,y,z,vx,vy,vz,rotation,r、互換表示座標renderX/Y/Z（2000px/mによる明示変換）。board.width=.5,height=.8、presentation={width:1000,height:1600,pxPerMeter:2000}。board.partsの全衝突形状を描画へ提供する。

board.partsは `{id,kind:'box'|'cylinder'|'capsule'|'mesh',tag,position,rotation,halfExtents?,radius?,halfHeight?,vertices?,indices?}`。箱はhalfExtents、円柱・カプセルはローカルy軸、メッシュ頂点はworld座標でposition原点。gateのみ可動でgame.gatePose.positionを描画に共有。pinsはposition半径とroleを持つ。

## 連続した機械構造

右下発射点→直線レール→上側円弧→釘盤面→入口→ゲート→3D溝→固定皿1→開口下の溝→固定皿2→固定皿3。失敗穴も開いた幾何形状と落下を使う。下側の通過センサーは実際の下向き通過を記録するだけで当否を乱数に置き換えない。皿の穴以外を透過して成功する場合は不具合とする。

釘は機能別の経路を座標群で設計。旧格子を使わない。皿は円周方向の溝を持つ独自曲面。球は曲面と開口の縁へ実接触し、速度によって穴を跨ぐ／落下する。皿の曲面とコライダーは同じ三角形を共有する。

## 旧データ

旧engine/config/physics/rendererをlegacy配下へ保存。version1リプレイは旧物理で再生し、version2・physicsVersion si-1の記録と混ぜない。旧設定・プリセットは無断でSI値として解釈せず、移行または非互換の説明を出す。Rapier worldはdisposeで解放し、UI離脱・新規セッション・Worker試行終了で必ず呼ぶ。

## 実装と検証順

1. SI設定・共通幾何・レール・機能別釘。
2. 球・可動ゲート・開口のある皿・同じ球による段間移動。
3. 共有形状の描画、9視点、規格／仮設計の表示。
4. 版を持つ保存とリプレイ、Worker、旧版互換。
5. SI寸法、CCD、エネルギー、穴の高速通過、全段成功と失敗、台帳・決定論、スマホ3幅・回帰・性能。

実機映像比較と物理iPhoneの実機検証は未確認事項として残す。
