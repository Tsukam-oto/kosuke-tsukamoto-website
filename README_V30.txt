束元康介 Official Website v30 — Cloudflare Pages 修正版

今回の修正
1. トップナビから独立ページへ直接移動できるよう変更
   WORKS -> /works/
   PROJECTS -> /music-education/
   PROFILE -> /profile/
2. ヒーローの「作品を見る」「創作プロジェクト」も独立ページへ接続
3. 各セクションの詳細ボタン表記を明確化
4. canonical / sitemap を Cloudflare Pages の公開URLへ更新
5. ページビュー表示を /api/pageview に変更
6. Cloudflare Pages Function functions/api/pageview.js を追加
   現在のNetlifyカウンターをサーバー側から中継するため、既存の累計値を継続できます。

公開方法
ZIPを展開し、GitHubリポジトリ Tsukam-oto/kosuke-tsukamoto-website のルートへ
中身をそのまま追加・上書きして commit してください。
Cloudflare Pages が main の更新を自動デプロイします。

確認URL
https://kosuke-tsukamoto-website.pages.dev/
https://kosuke-tsukamoto-website.pages.dev/works/
https://kosuke-tsukamoto-website.pages.dev/works/all-around-you/
https://kosuke-tsukamoto-website.pages.dev/music-education/
https://kosuke-tsukamoto-website.pages.dev/school-song/
https://kosuke-tsukamoto-website.pages.dev/profile/

注意
ページビューは移行期間中、旧Netlify Functionをデータ保存先として利用します。
Netlifyを完全に停止する前に、Cloudflare KV / D1等へカウンター保存先を移すと完全移行できます。
