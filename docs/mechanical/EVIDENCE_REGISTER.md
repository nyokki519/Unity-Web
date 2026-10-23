# 根拠台帳

|区分|受領・確認状況|利用可能な範囲|
|---|---|---|
|提供ZIP全10件|全文閲覧済み|調査方針と提供者の主張の記録|
|S01メーカー|URLのみ、原典未閲覧|メーカー確認の取得先候補|
|S02〜S06/S08|二次情報の要約、原典未閲覧|仮説・照合項目|
|S07接続PDF|URLのみ、原典未閲覧|型式・外部信号の照合候補。寸法根拠にしない|
|動画観察CSV|ヘッダーのみ|観測ゼロ。成功率算出不可|
|実機寸法・機構図|未受領|数値確定不可|

A=直接確認した一次資料、B=複数の実機映像で確認、C=推定、D=未確認。今回の機種固有数値はD（提供資料の主張）として扱う。提供されたメモをAへ自動昇格しない。

URL一覧と提供者の数値は [原文出典一覧](research-pack/01_SOURCES/SOURCES.md) と [暫定仕様](research-pack/02_MACHINE/SPEC.md) を参照。取得失敗は evidence/source-access.json に保存。

## v2追記

外部調査の21出典をEXT2-S01〜S21として evidence/external-source-ledger-v2.json に分離保存。同じS番号をv1と混同しない。外部報告の本文確認と、この環境の直接確認は別の列で管理。[受領評価](EXTERNAL_RESEARCH_REVIEW.md)参照。

## v3追記

[10件の原文台帳](external-research-20261022-v3/SOURCE_LEDGER.csv)と evidence/external-source-ledger-v3.json を追加。V3-Sxxで識別し外部確認を独立確認と区別。[差分・訂正](V3_RESEARCH_DELTA.md)参照。

## 最新: ユーザー添付動画UP-H3-01〜05

5本を取得し映像を直接フレーム観察した。[観察台帳](video-observations-20261023/OBSERVATIONS.csv)に11項目、手動投影座標6点を記録。外部パックの未再生動画IDとは同一性を推定せず、新しいIDで管理する。同一動画由来の複数事例は独立した複数実機での検証ではない。B（複数映像による照合）へ一律昇格しない。
