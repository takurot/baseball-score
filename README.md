# 野球スコアアプリ

少年野球の試合スコアを記録・管理するためのウェブアプリケーションです。

## 機能

- チーム情報と選手情報の管理
- 公式戦・練習試合の試合区分設定
- 打席結果の記録（ヒット、アウト、四球など）
- イニングごとのスコア表示
- 打席結果の一覧表示
- チーム・個人の通算成績表示（全試合・公式戦・練習試合の切り替え）
- 通算成績の対象は現在のユーザーの登録チームIDに一致するチームのみ。未登録の対戦相手の得点も勝敗・得失点に反映します。同名だけでは統合しません。
- 過去試合の修復：試合を開き「チームを選択」で登録チームを選び、選手の対応先を確認して反映し、試合を上書き保存します。同じ登録チームを選び直して選手だけ対応付けることもできます。未対応の選手・打席は保持します。
- 個人成績は選手IDごとに集計し、打席ゼロの控えも表示します。「登録試合数」は保存された名簿または打席に含まれる試合数で、守備・代走を含む出場数ではありません。
- 試合データの保存と読み込み
- 保存した試合の削除

## 技術スタック

- React
- TypeScript
- Material UI
- Firebase (Firestore)

## セットアップ方法

1. リポジトリをクローンします

```
git clone https://github.com/yourusername/baseball-score.git
cd baseball-score
```

2. 依存パッケージをインストールします

```
npm install
```

コード整形には Prettier を使用しています。以下で自動整形できます。

```
npx prettier -w .
```

3. 環境変数を設定します
   `.env.example`ファイルを`.env`としてコピーし、Firebase の設定情報を入力します。

4. アプリケーションを起動します

```
npm start
```

### テスト

```
npm test
```

## 環境変数

以下の環境変数を`.env`ファイルに設定する必要があります：

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## デプロイ方法

デプロイ先は `.firebaserc` のエイリアス（`production` / `staging`）で切り替えます。
対象を明示するため、常に `--project` にプロジェクト ID を指定してください。
`--project` を省略した `firebase` CLI コマンド（`firebase deploy`、
`firebase hosting:disable` など）は `default` エイリアス（= 本番プロジェクト）を
対象にするため注意してください。

1. ビルドを作成します

```
npm run build
```

2. Firebase にデプロイします

```
# 本番（baseball-score-18c48）
firebase deploy --project baseball-score-18c48

# ステージング（baseball-score-staging）
firebase deploy --project baseball-score-staging
```

## ライセンス

MIT
