# コード・素材の権利確認（2026-10-17）

対象：lampardrodgers/boqingge、コミット`04d95bccea18ad8579a2773bed343ba67e52666d`。
ユーザーが「作者から改変・公開の許可を得ています」と明示したため、その許諾情報を根拠にコードを改変・公開する方針へ変更した。作者との許諾文書を独自に確認したという意味ではない。package.jsonはISC表記、追跡ファイル18件に独立LICENSE/著作権表示はなかった。出所・許諾情報・変更内容とISC文面を配布用[NOTICE](../../public/silver-ring/NOTICE.txt)へ記載。

| 再利用対象 | 改変・扱い |
|---|---|
| config.js / physics.js | 発射、回転盤、羽根入口、皿、段移送の実装を再利用。設定のコインと明示したギミックの初期値を変更。物理本体の固定条件テストで元コードと軌道・イベントを照合 |
| scene.js / fx.js | 手続き生成の機構・カメラ・演出を再利用。独自の深緑カフェ外観、看板・カップの図柄・文言へ差替え。釘の表示配置をシード付き物理配置へ一致 |
| audio.js | 作者の手続き合成音を再利用。初期ミュートの出力初期化を修正 |
| main.js / ui.js / HTMLのCSS構造 | 操作・進行を再利用。日本語化、コイン表示、停止・復帰、低モーション、手動カメラ、練習操作、iframe連携を追加 |
| Three.js0.180.0 / addons12モジュール | 本プロジェクトの既存ロック版から配置。MIT表示をpublic/vendor/three/LICENSEに保持 |
| Rapier0.21.0 / earcut3.2.4 | 既存の接触物理検証モードで継続使用。Apache-2.0 / ISCの既存表示を保持 |
| 画像・音声・3Dモデルの外部素材 | 参考作に追跡対象のGLB/画像/音声ファイルなし。今回は作者の生成コードを許諾に基づき再利用。漫画・アニメの素材ファイルは導入しない |

参考作の漫画タイトル、組織名、キャラクター名、引用台詞、菱形ロゴ、看板文言はゲーム表示から除き、独自の「喫茶・銀環」とカップの図柄に変更する。機能上必要な釘・円盤・穴・段移送の配置と一般的なルールは維持する。作者許諾が第三者作品の固有表現を包括的に許諾するとは扱わない。

現金・購入・換金・景品は扱わない。全てゲーム内コイン。主ゲームの物理は参考作と同じ近似モデルであり、SI剛体モデルとは別に記録する。入口の割込みと最終段の送風は宣言した選択ルールとし標準は切る。これは権利回避ではなく、公平性と利用者への説明のための変更。

## 2026-10-17 recorded sound and artwork update
User-supplied recordings are now trimmed into breakthrough/jackpot MP3 clips.
User reported permission for embedding/redistribution; no independent written grant
was reviewed. See `RECORDED-AUDIO-AND-CABINET.md` and QA trim hashes.
The current cabinet backplate is newly AI-generated original ornamental artwork;
it replaces the previous coffee-mask graphic. No supplied manga image is embedded.

User supplied `ざわざわ.mp3` on 2026-10-17 and requested its integration; deployed as
`public/silver-ring/audio/zawa.mp3`. Decorative notes use the existing community cup
mark (`public/assets/unity-mark.webp`), not the Unity game-engine trademark.
