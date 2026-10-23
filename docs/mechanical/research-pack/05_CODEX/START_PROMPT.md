# Codexへの投入用プロンプト

このフォルダはネットワーク制限下で利用する「実機研究パック」です。対象はマルホン工業「Pはねものファインプレー」型式 PファインプレーH3（2025年）。`00_START/README.md`から順番に読み、`01_SOURCES/SOURCES.md`のURLと`02_MACHINE/SPEC.md`の暫定情報を確認してください。

重要：これは実機の完全な一次資料ではありません。動画、実機の高速度計測、正確な寸法は未収録です。未確認項目を想像で埋めず、証拠区分を維持してください。

対象リポジトリ：https://github.com/nyokki519/Unity-Web
1. 既存レトロ版・Unity MIX交流ゲームを変更・破壊しない。
2. ATELIERは削除許可済み。共有ライブラリ・参照を調べて安全に撤去可能。ただし削除実施は別コミットで、既存回帰テスト必須。
3. 新作の配置先は `public/mechanical/`。設計資料は `docs/mechanical/`。
4. この研究パックを `docs/mechanical/research-pack/` に格納し、ソース・根拠・不足資料の索引を整備。
5. `docs/mechanical/` にRESEARCH.md、EVIDENCE_REGISTER.md、MECHANISM_SPEC.md、PHYSICS_SPEC.md、PAYOUT_MODEL.md、TEST_PLAN.md、IMPLEMENTATION_PLAN.mdを作る。
6. 今回は研究資料整理・構造の未確認点の列挙・物理設計・開発計画まで。ゲーム本体の実装は禁止。
7. mainへのマージ・本番デプロイは禁止。追加月額0円を目標。
8. 必要な外部資料の収集指示を、優先順位と観察したいタイムコード・角度付きで具体的に提示。
9. 既存コードの全量再解析を避け、必要なファイルのみ読む。
10. 完了報告に、確定事項、推定事項、未確認事項、実装開始を止める条件を含める。
