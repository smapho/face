# 顔認証 出退勤システム

顔認証で出勤・退勤を打刻するWebアプリです。ビルド不要の素のHTML/JS + face-api.js（ブラウザ内顔認識）+ Supabase（データ保存）+ Vercel（ホスティング）構成です。

## 構成

- `index.html` — トップページ（メニュー）
- `register.html` / `js/register.js` — 顔の新規登録
- `attendance.html` / `js/attendance.js` — 出退勤の打刻（顔照合→自動でclock_in/clock_out判定）
- `js/faceEngine.js` — face-api.js のラッパー（モデル読込・カメラ・顔検出・特徴量比較）
- `models/` — face-api.js の学習済みモデル（tiny_face_detector, face_landmark_68, face_recognition）
- `sql/schema.sql` — Supabaseのテーブル定義・RLSポリシー

## セットアップ

### 1. Supabaseプロジェクトを作成

1. https://supabase.com でプロジェクトを作成
2. SQL Editorで `sql/schema.sql` の内容を実行
3. Project Settings > API から `Project URL` と `anon public key` を取得

### 2. 設定ファイルを作成

`js/config.example.js` を `js/config.js` としてコピーし、Supabaseの値を書き込む:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",
  MATCH_THRESHOLD: 0.55,
};
```

`js/config.js` は `.gitignore` 済みです（誤ってコミットしないよう注意）。

### 3. ローカルで動作確認

ブラウザの `getUserMedia`(カメラ) はHTTPS or localhost でのみ動作します。簡易サーバーで確認してください:

```bash
npx serve .
# または
python3 -m http.server 8080
```

`http://localhost:8080` を開いて動作を確認します。

### 4. Vercelにデプロイ

```bash
npm i -g vercel@latest
vercel
```

ビルド不要の静的サイトなのでFrameworkは "Other" のままでOKです。デプロイ後、Vercelのダッシュボードで `js/config.js` の内容相当を環境変数として管理したい場合は、ビルドステップを追加するか、`config.js` を直接デプロイ対象に含めてください（anon keyはSupabaseのRLSで保護されている前提で公開して問題ありません）。

## 使い方

1. トップページ → 「顔を登録する」で氏名入力＋顔を登録
2. トップページ → 「出退勤を打刻する」でカメラに顔を映してスキャン
   - 直近のログが `clock_in` なら次は自動的に `clock_out`、それ以外は `clock_in` として記録されます

## 注意事項・今後の改善ポイント

- 顔特徴量はブラウザ側で比較しています。MVPとして社内利用を想定しており、なりすまし対策（写真・動画によるスプーフィング防止のライブネス検出）は未実装です。本番運用ではまばたき検出や複数フレーム判定の追加を推奨します。
- RLSポリシーは anon キーで読み書き可能な設定になっています。管理者のみ登録可能にしたい場合はSupabase Authを導入し、`employees`テーブルへのinsertポリシーを制限してください。
- 顔特徴量(128次元ベクトル)は個人情報として扱われる可能性があります。取り扱いには十分注意してください。
