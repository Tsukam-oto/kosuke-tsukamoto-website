# 知の図書館｜出典候補の自動収集

## 実行の流れ

GitHub Actions `.github/workflows/knowledge-evidence-collector.yml` が、**毎週月曜・木曜の12:19（日本時間）**に起動します。GitHub Actions のスケジュールは遅延・スキップする場合があります。手動起動は GitHub → Actions → **Knowledge Library · verified-source intake** → **Run workflow** です。

1. `research/seeds.json` に登録した検索テーマから、音楽、心理・臨床、神話・歴史、科学・社会を毎回2件ずつ選びます。月曜・木曜は異なる検索テーマを優先します。
2. Crossref / OpenAlex から**論文等の書誌情報**を取得します。DOI が一致すれば情報源を併記して重複をまとめます。
3. MusicBrainz から**作品ID候補**を取得します。特定の録音や Apple Music Classical のリンクと同一視しません。
4. The Met の公式APIから**収蔵作品の情報**を取得します。APIの `isPublicDomain === true`、かつ画像ドメインが美術館に一致したときだけ画像リンクを収録します。画像の権利判断は国・利用形態ごとの法的な保証ではありません。
5. 固定の原典・翻訳へのリンクを付け、`../research-candidates.json` に保存。スマホ対応の `../research.html` に表示します。

APIキーがなくても少量の情報を取得できます。OpenAlexの利用上限を増やす場合だけリポジトリのActions secretsに `OPENALEX_API_KEY` を設定できます。Crossref の連絡先は任意の repository variable `RESEARCH_CONTACT_EMAIL` です。**秘密情報を公開サイトのJavaScriptへ置かないでください。**

## 根拠レベルの区別

| ステータス | 意味 |
|---|---|
| 資料候補（未照合） | APIに書誌・作品データがあることを確認。本文は読んでいません |
| 原典・文献を確認 | 実際に原典の該当箇所・研究本文を読み、主張と照合した段階（現在の自動処理では付けません） |
| 記事で根拠を表示 | 人が内容を検証した上で、主張・範囲・留保を `../evidence.js` などへ編集した段階 |

**検索順位、掲載誌、引用数、DOIの有無は、その研究結論の信頼度を示しません。** 臨床心理学・自己研鑽の話題では、観察研究と介入研究、システマティックレビューと個人の体験談を分けて読み、反証や出版バイアスも確認します。

## 運用・失敗時の対応

- 収集はAPIによって失敗することがあります。すべて失敗した場合、既存の `research-candidates.json` は上書きしません。
- GitHubへの書き戻しには、GitHub Contents APIを使用し、失敗時は再試行します。Actionsログで成否を確認できます。
- 取得したAPI結果の本文・抄録を転載しません。書誌情報と元資料へのリンクのみ扱います。
- `research-candidates.json` は**公開ファイル**です。ユーザーのメモ・学習記録・ログイン情報を一切入れないでください。
- GitHub Actions が停止・権限不足・スケジュール無効の場合、更新されません。最新収集日とエラーは画面で確認します。
- 新しいテーマは `research/seeds.json` の `topics` に検索語と関連ページを追加します。テーマの追加だけでは記事は生成されません。
- 研究本文に基づく新規記事の自動公開は未実装です。**資料の自動発見と、根拠が検証された記事の自動作成は別機能**として扱います。

## 開発テスト

```sh
python -m unittest discover -s chi-no-toshokan/research -p 'test_*.py' -v
python chi-no-toshokan/research/collect.py --fixture
python chi-no-toshokan/research/collect.py
```

第三者APIの規約・速度制限は変更されます。定期的に公式ドキュメントを確認してください。

## 研究準備票と公開前の検証（追加）

- `research/build_dossiers.py` は `research/seeds.json` と `research-candidates.json` から、20テーマの**研究準備票**を `research-dossiers.json` に生成します。検索語・和文の問い・候補資料・文献種別・原典確認や反証確認のチェック項目を整えます。**研究本文の結果は要約・評価しません。**
- `research-dossiers.html` はスマホで閲覧できる確認画面です。見出しからテーマを開き、出典へ飛べます。0件のテーマは不足を明記します。
- `research/validate_public.py` は書誌と調査票のタイトル・URL一致、画像CC0フラグ、承認済みの主張が勝手に生まれていないことを検査します。
- `research/test_dossiers.py` と `research/test_dossiers_ui.cjs` は虚偽の検証済み状態・危険なURL・HTMLの無害化などをテストします。GitHub Actionsで **テスト → 公開前検証 → 公開データ更新** の順番を守り、失敗時は更新を止めます。
- 心理・臨床領域などの検索には **Europe PMC** のメタデータを追加しています。文献種別は資料元が返す情報をそのまま整理し、メタ分析・レビュー等の名称を「研究の質の保証」には使いません。抄録の文章は公開データに転載しません。
- 公開データは `research-candidates.json` と `research-dossiers.json` のみ。GitHub Contents APIで各ファイルを更新します。途中で片方の更新だけ成功した場合に備え、`generatedFrom` と収集日時を監視してください。

### 依然として未実装の範囲

- 原論文本文を解析し、実際の主張と統計的・方法論的根拠を突き合わせた**自動検証**
- 文献の全文利用権限と翻訳・図版・引用条件まで含めた最終権利審査
- チェックを通過した主張の自動記事化／自動公開（誤情報防止のため保留）

今後この層を加える場合も、本文にアクセスできない・根拠が不明な主張は公開しない方針を維持してください。
