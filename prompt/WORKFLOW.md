# 野球スコアアプリ開発ワークフロー

**最終更新:** 2026-08-16
**対象:** `baseball-score` v0.1.0

このドキュメントは、野球スコアアプリの機能追加・不具合修正・ドキュメント更新を、
設計意図と実装のずれを抑えながら進めるための手順です。

## 1. ドキュメントと実装の優先順位

変更を始める前に、次の順番で確認します。

1. [README](../README.md) — 機能一覧、セットアップ、環境変数、デプロイ手順
2. [UI構造ドキュメント](UI.md) — 画面構成、コンポーネント、デザインシステム
3. [改善計画](PLAN.md) — UI/UX 改善の方向性とスコープ
4. 実装コード — `src/` 配下の実際の挙動
5. テスト — 実装された契約を保護する検証（`__tests__/`、`*.a11y.test.tsx`）

ドキュメントと実装が異なる場合、意図を推測して片方だけを変更しません。差分の理由を
確認し、実装を正とするなら README・UI.md・PLAN.md の該当記載も同じ変更で更新します。
対応する GitHub Issue のない新機能を、PLAN.md や Issue のスコープ外に追加しません。

## 2. 作業開始時の確認

### 2.1 リポジトリと作業ツリー

```bash
git checkout main
git pull --ff-only
git status --short --branch
```

既存の変更を削除したり、`git reset --hard` で上書きしたりしません。自分の変更と
無関係な変更が混在している場合は、対象ファイルを明示して作業します。

### 2.2 タスクのコンテキスト

GitHub Issue がある場合は、実装前に内容、コメント、受け入れ条件を確認します。

```bash
gh issue view <ISSUE> --json title,body,comments,labels
```

次に、対象機能に関係する README と UI.md の該当節を読み、次を短く整理します。

- 変更対象ファイル（コンポーネント、hook、サービス、`firestore.rules`）
- 既存 UI・props・Firestore スキーマとの互換性
- 追加・変更するテスト（unit / a11y の区分）
- 完了条件と、この環境では確認できない条件

## 3. ブランチと計画

`main` に直接コミットせず、タスクごとにブランチを作成します。ブランチ名は
`fix/` / `feature/` を接頭辞とし、Issue 番号を含めます。

```bash
git switch -c fix/<ISSUE>-<short-description>
# Issue がない場合
git switch -c feature/<short-description>
```

実装前に、変更を小さな順序付きステップへ分解します。各ステップには、完了を
確認するテストまたはコマンドを対応付けます。計画に含める項目は次のとおりです。

| 項目 | 内容 |
| --- | --- |
| 変更対象 | `src/components/`、`src/hooks/`、`src/firebase/`、`firestore.rules` などの具体的なパス |
| UI 契約 | 画面モード、props、表示テキスト（日本語）、モバイル表示 |
| データ契約 | Firestore のコレクション構造、保護フィールド（`userId`、`createdAt`）、認証状態 |
| テスト | unit / a11y の区分とケース |
| リスク | 既存試合データの互換性、認証・ネットワークエラー、パフォーマンス、アクセシビリティ |
| 完了条件 | Issue の受け入れ基準のどの項目を、どのテストで確認するか |

## 4. 実装サイクル

TypeScript / React の変更は、可能な限り Red → Green → Refactor の順で進めます。

### Red: 失敗するテストを先に作る

仕様に対応する最小の再現テストを追加し、意図した理由で失敗することを確認します。
このアプリで優先する境界は次のとおりです。

- 打率・出塁率・勝率などの成績計算が公式の計算式に一致する
- 打席結果の追加・編集・削除で、二重登録や状態の残留が起きない
- 編集モード終了時に、前回入力が次の新規入力に持ち越されない
- undo / redo が履歴を壊さず、上限を超えてメモリを膨張させない
- 未ログイン状態、認証エラー、Firestore のエラーで画面が崩壊しない
- 他ユーザーの試合・チームが所有権チェックなしに読み書きされない
- 公開（シェア）ゲームのペイロードに所有者のメール等の PII が含まれない
- 主要画面が jest-axe の重大な違反なしで描画される

### Green: 最小限の実装

テストを通すために必要な範囲だけを実装します。責務の分割は次の表に合わせます。

| 領域 | 主な責務 |
| --- | --- |
| `src/components/` | 各画面・部品の表示と操作。Firestore への直接アクセスは持たない |
| `src/hooks/` | ゲーム状態、打席履歴、成績計算、undo/redo などの状態ロジック |
| `src/services/` | `ScoreCalculator` など、純粋で再利用可能な計算 |
| `src/firebase/` | Auth / Firestore アクセスと所有権チェックの集中管理 |
| `src/theme/` | MUI テーマとデザイントークン |
| `src/utils/` | 既定選手などの汎用ヘルパー |
| `src/types/` | 共有型定義 |

追加のルールは次のとおりです。

- 画面表示テキストは日本語、識別子・コメントは英語とする
- Firebase SDK の呼び出しは `src/firebase/` 配下に限定する
- 成績計算・結果分類のロジックをコンポーネントに埋め込まず、hooks か
  services に集約する（実装の重複による乖離を防ぐ）
- `userId`、`createdAt` などの保護フィールドを書き換える経路を作らない
- 更新系の Firestore 書き込みは関数型更新またはトランザクションで競合に耐える形にする

### Refactor: 挙動を保った整理

Green 後に重複や命名を整理します。リファクタリング後は同じテストを再実行し、
props の契約、日本語表示、a11y テストの結果を維持します。

## 5. テストと品質ゲート

実装が存在する段階では、次の順で検証します。

```bash
npm run lint
npx tsc --noEmit
npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"
npm test -- --watchAll=false
npm run build
```

これらを一括で実行するのが `npm run ci:local` です。PR 前には必ず通します。

- カバレッジは `npm run test:ci` で計測し、対象は `src/hooks/` と `src/services/`
- アクセシビリティは jest-axe を使う `*.a11y.test.tsx` で検証する
- ビルド後のゲートとして `node scripts/check-bundle-size.js`、
  `node scripts/check-coverage.js`（`test:ci` 実行後）を通す
- UI の変更は `npm start` でデスクトップとモバイル幅の両方を目視確認する
- `firestore.rules` を変更した場合は、所有権（`userId`）の境界をエミュレータ
  （`firebase emulators:start --only firestore`）またはレビューで確認する

実行できない検証（実機、エミュレータ環境など）は、成功扱いにせず PR に記録します。

## 6. セキュリティと安全性

- `REACT_APP_` 接頭辞の変数はクライアントに公開される。秘密情報を含めない
- Firebase のサービスアカウントキー（`serviceAccountKey*.json` 等）や `.env*` を
  コミットしない
- `firestore.rules` は `request.auth.uid == resource.data.userId` による他ユーザー
  データの保護を維持する。コード側の所有権チェックは補助であり、ルールが最終防衛線
- チーム名・選手名・メモなどのユーザー入力を描画する際は、React のエスケープを
  壊す `dangerouslySetInnerHTML` 等を使わない
- 公開（シェア）ゲームのレスポンスに `userEmail` などの PII を含めない
- `npm overrides` や dependabot 対応では、npm 上に実在するバージョンのみを指定する

## 7. ドキュメント同期

実装変更が次のいずれかに影響する場合は、コードと同じ変更でドキュメントを更新します。

- 機能、セットアップ、環境変数、デプロイ手順 → `README.md`
- 画面構成、ナビゲーション、デザインシステム → `prompt/UI.md`
- 改善計画の項目の完了・変更 → `prompt/PLAN.md`
- 実装手順、検証手順 → この `prompt/WORKFLOW.md`

すべてのドキュメントに古いパスや、まだ存在しない機能の記載を残しません。

## 8. コミットとプルリクエスト

コミット前に、対象ファイルだけを確認します。

```bash
git diff --check
git diff
git status --short
git add <explicit-files>
git commit -m "<concise change description>"
git push -u origin HEAD
```

コミットには、変更と無関係な `build/`、`coverage/`、`node_modules/`、`.env*`、
`junit.xml`、一時ファイルを含めません。

プルリクエストには次を記載します。

- 何を変更したか、なぜ変更したか
- 対応する Issue の受け入れ基準（関連 Issue があれば `Closes #<ISSUE>`）
- 実行したテストと、環境上実行できなかったテスト
- UI 変更はスクリーンショット（デスクトップとモバイル）
- Firestore スキーマ・セキュリティルールへの影響

### 8.1 Open Code Review によるコードレビュー

PR を作成したら、マージ前に
[Open Code Review](https://github.com/alibaba/open-code-review) の `ocr review` で
PR ブランチが導入する差分をレビューします。初回利用時は公式手順に従って CLI と
LLM を設定し、レビュー前に接続を確認します。

```bash
which ocr
ocr llm test
```

PR の目的、受け入れ条件、非スコープを短い background にまとめ、最新のリモート
base と現在のブランチを範囲モードで比較します。`--preview` で対象ファイルを確認して
から、agent 向けの最終サマリーを生成します。

```bash
git fetch origin main
ocr review --preview --from origin/main --to HEAD
ocr review --audience agent \
  --background "<PR の目的、受け入れ条件、重点的に確認する境界>" \
  --from origin/main \
  --to HEAD
```

レビュー結果はそのまま採用せず、指摘箇所の実装、テスト、Firestore 契約を確認して、
再現可能性と影響を検証します。妥当な High / Medium の指摘は最小修正と回帰テストを
追加し、テスト、コミット、push 後に同じ範囲で `ocr review` を再実行します。
誤検知、根拠のない推測、今回の非スコープは理由を記録して除外します。

PR の本文またはコメントには、実行した `ocr review` コマンド、確認した指摘、
対応内容、未解決事項を記録します。対象拡張子がないためレビューがスキップされた
場合も、その結果を記録します。Open Code Review はテスト、静的解析、セキュリティ
確認、人手レビューの代替にはしません。

PR の全チェック（CI/CD Pipeline、Quality Gate、CodeQL）を確認し、失敗した場合は
ログを読んで最小修正と回帰テストを追加します。

## 9. リリース前チェック

次を確認してから `main` をリリース扱いにします。

- [ ] `README.md`、`prompt/UI.md`、このワークフローの記載が一致している
- [ ] `npm run ci:local` が通る
- [ ] GitHub Actions の全ジョブが成功している
- [ ] `npm run build` が成功し、バンドルサイズがゲート内に収まっている
- [ ] `firestore.rules` の変更が意図した所有権境界を保っている
- [ ] `.env.example` が実際に使用する環境変数と一致している
- [ ] Firebase へのデプロイは `--project` で対象を明示する（`.firebaserc` の
      `staging` エイリアス解決まで、エイリアスではなくプロジェクト ID を指定）
- [ ] GitHub の `main` とローカルのリリースコミットが一致している

## 10. 現在の構成を確認する

ファイル一覧は変化しやすいため、この文書には静的な tree snapshot を置きません。
レビュー時は `git ls-files` を正として確認します。安定した責務境界は
「4. 実装サイクル」のモジュール表、テスト区分は「5. テストと品質ゲート」を参照します。
