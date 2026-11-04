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
