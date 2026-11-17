# 野球スコアアプリ

少年野球の試合スコアを記録・管理するためのウェブアプリケーションです。

## 機能

- チーム情報と選手情報の管理
- 公式戦・練習試合・ジュニア戦の試合区分設定
- 打席結果の記録（ヒット、アウト、四球など）
- イニングごとのスコア表示
- 打席結果の一覧表示
- チーム・個人の通算成績表示（全試合・公式戦・練習試合・ジュニア戦の切り替え）
- 通算成績の対象は現在のユーザーの登録チームIDに一致するチームのみ。未登録の対戦相手の得点も勝敗・得失点に反映します。同名だけでは統合しません。
- 過去試合の修復：試合を開き「チームを選択」で登録チームを選び、選手の対応先を確認して反映し、試合を上書き保存します。同じ登録チームを選び直して選手だけ対応付けることもできます。未対応の選手・打席は保持します。
- 個人成績は選手IDごとに集計し、打席ゼロの控えも表示します。「登録試合数」は保存された名簿または打席に含まれる試合数で、守備・代走を含む出場数ではありません。
- 通算成績のチーム名・選手名から打撃成績の推移グラフを開けます。打率・出塁率・長打率・OPSを、各試合までの打席を合計して計算した累積値として1つのグラフに重ねて表示します。各試合の率の平均ではありません。試合は日付順に並び、同日の試合は保存されたIDの順で、実際の開催順とは限りません。初打席前の試合は「—」、打席がない場合は「打席記録なし」と表示します。日付が不正な試合があると、理由を表示してグラフを作成しません。
- 試合画面では選手を新規追加できません。選手の新規登録は「チーム・選手管理」で行い、試合画面の「チームを選択」で登録チームを選び直してください。チーム選択ダイアログの「チームを登録」から、試合の内容を保ったままチーム登録画面へ移動できます（「試合画面に戻る」で復帰）。
- 試合内で誤追加した選手は、選手の編集（鉛筆）から「この試合から削除」で取り除けます。打席がある選手は記録を保持するため削除できません。削除後は試合を上書き保存してください。登録チームの名簿や他の試合は変更しません。
- 試合データの保存と読み込み
- 保存した試合の削除

## 技術スタック

- React
- TypeScript
- Material UI
- Firebase (Firestore)

## セットアップ方法

Node.js 24.12.0 以上が必要です（Firebase SDK の要件）。推奨は Node.js 24 LTS です。
`nvm use` で `.nvmrc` のバージョンを選択できます。CI は 24.12.0・24 系・26 系で検証します。

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

Firestore セキュリティルール（`firestore.rules`）のテストは、エミュレーターで実行します
（Java 21 と `firebase-tools` が必要です。CI の `Firestore Rules Test` ジョブでも実行されます）。

```
npm run test:rules
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

### 認証のセキュリティ設定（Firebase Console）

パスワードリセットは、未登録のメールアドレスでも登録済みと同じ「送信しました」を表示し、
アカウントの存在を外部から確認できないようにしています（アプリ側の対応）。
サーバー側でも列挙を塞ぐため、管理者が Firebase Console で次を有効にしてください
（**Console 操作は未実施**です）。

1. Firebase Console → Authentication → Settings → User actions
2. 「Email enumeration protection（メール列挙保護）」を有効にする
3. 有効にすると、未登録のメールアドレスに対する一部の API が、存在しない場合でも成功扱いの応答になります。ログイン時の誤りは `auth/invalid-credential` で返るため、アプリ側でも同じ汎用メッセージ（「メールアドレスまたはパスワードが正しくありません」）に対応済みです

※ 本Issueのアプリ側の対応だけでは、Identity Toolkit の応答（`EMAIL_NOT_FOUND`）をネットワークや REST API から直接確認される経路は塞げません。この設定が、その経路を塞ぐ唯一の手段です。

新規登録時の `auth/email-already-in-use` の表示は、利用者の案内として必要なため対象外です。

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

### 公開試合のアクセス範囲と所有者メールアドレスの移行

- 公開した試合（`isPublic == true`）は、**ID を知っている人だけが単一取得**できます。
  一覧・クエリでの列挙は `firestore.rules` で拒否されます。
- 試合・チームには所有者のメールアドレス（`userEmail`）を保存しません。
  以前の保存で書き込まれた値は、試合を更新保存するか、公開設定を切り替えると削除されます。
  残っているドキュメントは、次の手順でまとめて削除します（**本番への実行は管理者が行います**）。

```
npm i --no-save firebase-admin
gcloud auth application-default login
# 対象件数の確認のみ（既定。何も書き込みません）
node scripts/remove-user-email.js --project=baseball-score-18c48
# 削除を実行
node scripts/remove-user-email.js --project=baseball-score-18c48 --apply
```

### Firestore ルールの書き込み検証と App Check

- `games` / `teams` の更新では、`userId` と `createdAt` は変更できません。`userEmail` は新しい値を設定できず、削除のみ可能です。
- 新規作成では、`userId` が自分であること、許可されたキーのみであること（`userEmail` は不可）、主要フィールドの型（`date` が文字列、`isPublic` が真偽値、など）が検証されます。
- 更新でも、変更・追加できるキーと主要フィールドの型を同じ基準で検証します（作成後の更新で検証を迂回できません）。
  旧データが持つ現在の型にないフィールドは、触れない限りそのまま残せます。
- ドキュメントのサイズ上限（1MB）は、ルールでは検証できません。クライアントのチェックに加えて、App Check で不正なクライアントからの書き込みを抑止します。

App Check（reCAPTCHA v3）は、`REACT_APP_RECAPTCHA_SITE_KEY` を設定したときだけ有効になります（未設定なら初期化しません）。
有効化は管理者が次の順で行います（**Console 操作と強制は未実施**です）。

1. Firebase Console の App Check でウェブアプリを reCAPTCHA v3 で登録し、site key を取得する。
2. `REACT_APP_RECAPTCHA_SITE_KEY` を設定してビルド・デプロイする。ローカル開発では Console でデバッグトークンを登録し、`REACT_APP_APPCHECK_DEBUG_TOKEN` に設定する（本番ビルドでは無視されます）。
3. Console の App Check の指標で、トークン付きリクエストの割合を確認する。
4. 問題がなければ Cloud Firestore の「強制」を有効にする。強制すると、トークンを送らない旧バージョンのクライアントは拒否されます。

### セキュリティヘッダ（Firebase Hosting）

`firebase.json` の `hosting.headers` で、次のヘッダを全レスポンスに付与します。

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`（Firebase Hosting が既定で返す値より弱くならないよう `includeSubDomains` を付与。`preload` は付けていません）
- `Permissions-Policy`: カメラ・マイク・位置情報・決済・USB・`interest-cohort` を無効化
- `Content-Security-Policy`: `frame-ancestors 'self'`、`img-src` は許可オリジンを列挙、`connect-src` から Realtime Database（`*.firebaseio.com`）を削除
- `style-src 'unsafe-inline'` は、MUI/Emotion がインラインスタイルを挿入するため残しています（受け入れたトレードオフ）。スクリプトは `'unsafe-inline'` / `'unsafe-eval'` を許可していません。

CSP の値は `firebase.json` が唯一の情報源で、ビルド時に `build/index.html` の meta タグへ反映します
（`frame-ancestors` など meta では無効なディレクティブは除きます）。
ヘッダを変更した場合は、デプロイ後にログイン・試合一覧・成績画面でコンソールに CSP 違反が出ないことを確認してください。

## ライセンス

MIT

通算成績の「PDF出力」で登録チームを選択すると、全期間の公式戦・練習試合・ジュニア戦を順に含むA4横向きPDFを保存できます。同名チームはIDで区別します。各区分は成績表の後に、チームと全選手の打撃成績推移グラフを1ページ最大2図で掲載します。成績表には打席・犠打・犠飛を含め、打席 = 打数 + 四死球 + 犠打 + 犠飛 を各行とチーム合計で検算できます。先頭ページの「指標の定義」に、打率・出塁率・長打率・OPS・勝率の計算式、分母が0のときの扱い、率は四捨五入前の値で計算する旨を記載しています。先頭ページには区分別（統合しない）のサマリーと、実際のページ番号つきの目次を付け、目次の項目やPDFビューアのブックマークから成績表・対象試合一覧・グラフ（選手別を含む）へ移動できます。「簡易版」を選ぶと、期間（開始日・終了日を含む）、出力する区分、グラフ（表のみ／チームのみ／チームと全選手、打席記録のない選手の枠の省略）を選べます。期間を選ぶと、成績表・対象試合一覧・グラフは同じ試合の集合から再集計します。成績表は選手数や氏名の長さに応じて続きページを追加し、グラフの数だけページ数と作成時間が増えます。現名簿の未登場選手も、成績表では「該当記録なし」、グラフでは「打席記録なし」として掲載します。登録試合数は実際の出場数ではありません。生成は端末内で行い、日本語フォントは同じサイトから必要時に読み込みます。
