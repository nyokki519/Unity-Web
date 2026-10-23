# ATELIER撤去報告

専用28ファイルを削除。内訳: public/atelier/ 9件、専用テスト2件、調査スクリプト1件、旧設計・計画2件、旧QA14件。ホーム導線とSW事前キャッシュも除去し、キャッシュをv40からv41へ更新。旧比較資料2件の不要参照を整理した。

共有Three.js（MIT）、Rapier（Apache-2.0）、earcut（ISC）、フォントとライセンス、package/lockを保護。専用外部モデル・音源はなく、共有資産は削除していない。詳細な削除一覧・共有SHA256は ../qa/retirement-regression/manifest.json。

検証: npm test 208件成功。独立6ブラウザの交流6モードと司会復旧、390pxレトロ版、ホーム導線、共有URLを確認。ATELIER URLは404。旧SWからv41への移行で専用キャッシュ消去、既存ゲーム資産維持、強制リロードなしを確認。Chromium検証であり物理iPhone検証ではない。

レトロ版、交流ゲームのサーバー、CPU、vendorの内容は変更していない。mainへのマージ・本番公開なし。
