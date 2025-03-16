# 野球スコアアプリ

少年野球の試合スコアを記録・管理するためのウェブアプリケーションです。

## 機能

- チーム情報と選手情報の管理
- 打席結果の記録（ヒット、アウト、四球など）
- イニングごとのスコア表示
- 打席結果の一覧表示
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

3. 環境変数を設定します
   `.env.example`ファイルを`.env`としてコピーし、Firebase の設定情報を入力します。

4. アプリケーションを起動します

```
npm start
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

1. ビルドを作成します

```
npm run build
```

2. Firebase にデプロイします

```
firebase deploy
```

## ライセンス

MIT
