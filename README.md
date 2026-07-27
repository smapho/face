# 顔認証 出退勤システム

顔認証で出勤・退勤を打刻するWebアプリです。ビルド不要の素のHTML/JS + face-api.js（ブラウザ内顔認識）+ Supabase（データ保存）+ Vercel（ホスティング）構成です。

## 構成

- `index.html` — トップページ（メニュー）
- `register.html` / `js/register.js` — 顔の新規登録
- `attendance.html` / `js/attendance.js` — 出退勤の打刻（顔照合→自動でclock_in/clock_out判定）
- `js/faceEngine.js` — face-api.js のラッパー（モデル読込・カメラ・顔検出・特徴量比較）
- `models/` — face-api.js の学習済みモデル（tiny_face_detector, face_landmark_68, face_recognition）
- `sql/schema.sql` — Supabaseのテーブル定義・RLSポリシー
- `api/config.js` — Vercel Function。Vercelの環境変数(`SUPABASE_URL` / `SUPABASE_ANON_KEY`)を読み、`window.APP_CONFIG`をブラウザに返す

## セットアップ

### 1. Supabaseプロジェクトを作成

1. https://supabase.com でプロジェクトを作成（またはVercel Marketplace経由: `vercel integration add supabase`）
2. SQL Editorで `sql/schema.sql` の内容を実行
3. Project Settings > API から `Project URL` と `anon / publishable key` を取得

### 2. Vercelに環境変数を設定

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_URL preview
vercel env add SUPABASE_URL development
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_ANON_KEY preview
vercel env add SUPABASE_ANON_KEY development
```

設定は `api/config.js`（Vercel Function）がリクエスト時に読み込み、`/api/config.js` として `window.APP_CONFIG` をブラウザに返します。`js/config.example.js` はローカルで素の静的サーバーを使う場合の参考用テンプレートです。

### 3. ローカルで動作確認

`api/config.js` はVercel Functionのため、`vercel dev` を使ってください（環境変数は `vercel env pull` で同期されます）:

```bash
npm i -g vercel@latest
vercel env pull .env.local
vercel dev
```

ブラウザの `getUserMedia`(カメラ) はHTTPS or localhost でのみ動作するため、`vercel dev` が出すlocalhost URLで確認します。

### 4. Vercelにデプロイ

```bash
vercel        # プレビュー
vercel --prod # 本番
```

## 使い方

1. トップページ → 「顔を登録する」で氏名入力＋顔を登録
2. トップページ → 「出退勤を打刻する」でカメラに顔を映してスキャン
   - 直近のログが `clock_in` なら次は自動的に `clock_out`、それ以外は `clock_in` として記録されます

## 注意事項・今後の改善ポイント

- 顔特徴量はブラウザ側で比較しています。MVPとして社内利用を想定しており、なりすまし対策（写真・動画によるスプーフィング防止のライブネス検出）は未実装です。本番運用ではまばたき検出や複数フレーム判定の追加を推奨します。
- RLSポリシーは anon キーで読み書き可能な設定になっています。管理者のみ登録可能にしたい場合はSupabase Authを導入し、`employees`テーブルへのinsertポリシーを制限してください。
- 顔特徴量(128次元ベクトル)は個人情報として扱われる可能性があります。取り扱いには十分注意してください。
