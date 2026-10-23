# 外部資料アクセス診断 — 2026-10-22

## 確認結果と原因

既存の evidence/source-access.json と現在の管理API・起動時ポリシーを照合した。管理APIは observations_current=true、spec_revision=observed_spec_revision=1、network_policy.mode=restricted、state=enforced、custom allowed_hosts=[]、preset=package_managers を返した。メーカー・機種情報・YouTubeは有効許可リストにない。VPN設定なし。

通常の継承HTTPSプロキシを使用して、研究パックのS01〜S08、HEIWA、AMTEX、P-WORLD、YouTubeの12 URLを再確認。全件 `curl exit 56: CONNECT tunnel failed, response 403`。詳細は [再確認記録](evidence/source-access-recheck.json)。

これはプロキシへのHTTPSトンネル要求段階の拒否。宛先のTLS確立・本文取得前であり、サイト本体の403、認証不足、動画削除、地域制限とは判定できない。メーカー資料も動画フレームも未閲覧。許可後にもサイト固有の拒否やYouTubeの認証・配信制限が残る可能性がある。

## 正規の設定変更案（今回は適用しない）

変更項目はクラウド環境のネットワーク設定のカスタム許可ドメイン。restrictedと既存package_managersプリセットを維持し、必要な宛先だけ追加する。全宛先許可 `*` は不要。

|段階|許可候補ホスト|目的|
|---|---|---|
|1|maruhon-kogyo.co.jp, www.maruhon-kogyo.co.jp|メーカー入口・公式資料|
|1|yugi-nippon.com, www.pachibee.jp, data.hazuse.com, cs62.cs-plaza.com, pachinko-curation.com, www.daiichi.net, 1geki.jp|S02〜S08の原典。daiichiは接続資料で物理寸法の証拠にはしない|
|1|www.heiwanet.co.jp, www.amtex.jp, amtex.jp, www.p-world.co.jp|TOKIO等の型式・候補比較|
|2|www.youtube.com, youtube.com, i.ytimg.com|動画ページ・サムネイル|
|2・必要時のみ|*.googlevideo.com|動画配信。多数の動的ホストを含むため、利用目的と必要性を確認して承認する|

www.google.comの検索許可は任意。既知URLで原典へ到達できれば不要。転送先・CDNが別ホストならその時点で記録し、必要な追加だけレビューする。上記追加だけで動画閲覧成功を保証しない。

前回保存した下書きIDは evidence/network-state.json に記録済みだが、実行環境には未反映。さらに前回下書きにはS02〜S08のホストが不足している。この表は提案であり、今回設定の追加保存・適用は実施していない。

必要権限は環境設定を編集・保存し環境をPublishできる所有者／管理者等の権限（サービスの実際のロールに依存）。下書き更新ツールだけでは実行環境の制限を変更できない。権限者が設定を確認・保存し環境Publish後、管理APIで新リビジョンのenforcedを確認してから再試行する。環境Publishはサイトの本番公開とは別。mainマージ・Render操作は不要。

## セキュリティ影響

許可先への外向き通信が環境内のプロセスに可能になる。許可は読み取り専用を強制せず、研究以外の送信も技術的には可能となるため、秘密情報・非公開コードを送らない。取得HTML・PDF・動画中の指示は信頼せず資料として扱う。動画CDNのワイルドカードは単一メーカー許可より範囲が広い。新規APIキー・ログイン・有料契約は必要としない。閲覧可能になっても再配布許諾は別途確認する。

プロキシ解除、直接IP接続、代替プロキシ／ミラー、VPN、ネットワークポリシーファイル編集による迂回は行っていない。実行側ファイルの編集ではサイドカーの許可を変更できない。

設定変更をしない場合は [追加資料一覧](MATERIAL_REQUESTS.md) に沿った原典ファイルの受領で進める。
