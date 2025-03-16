# 野球スコアアプリ

React と Material UI を使用した野球のスコア記録アプリケーションです。

## 機能

- 2 つのチーム（ホームとアウェイ）の管理
- 選手の追加・編集・状態管理（出場中/控え）
- 打席結果の記録（ヒット、ホームラン、三振など詳細な結果）
- イニングごとの打席結果表示
- スコアボード表示
- タブによるチーム切り替え

## 使い方

1. まず、各チームの選手を「選手を追加」ボタンから登録します。
2. 選手を登録したら、出場中の選手リストから「打席登録」ボタンをクリックして選手を選択します。
3. 控えの選手は「出場させる」ボタンをクリックすると出場中の選手に切り替わります。
4. 選択した選手の打席結果を入力フォームから登録します。
5. イニングは「前の回」「次の回」ボタンで切り替えられます。
6. チームはタブで切り替えられます。
7. スコアボードは自動的に更新されます。

## 打席結果の種類

### ヒット系

- IH: 内野安打 (Infield Hit)
- LH: レフトヒット (Left Hit)
- CH: センターヒット (Center Hit)
- RH: ライトヒット (Right Hit)
- 2B: 二塁打 (Double)
- 3B: 三塁打 (Triple)
- HR: ホームラン (Home Run)

### アウト系

- GO_P: ピッチャーゴロ (Ground Out to Pitcher)
- GO_C: キャッチャーゴロ (Ground Out to Catcher)
- GO_1B: ファーストゴロ (Ground Out to 1st)
- GO_2B: セカンドゴロ (Ground Out to 2nd)
- GO_3B: サードゴロ (Ground Out to 3rd)
- GO_SS: ショートゴロ (Ground Out to Shortstop)
- FO_LF: レフトフライ (Fly Out to Left)
- FO_CF: センターフライ (Fly Out to Center)
- FO_RF: ライトフライ (Fly Out to Right)
- FO_IF: 内野フライ (Infield Fly)
- LO: ライナーアウト (Line Out)
- DP: 併殺打 (Double Play)
- SO: 三振 (Strike Out)

### その他

- SAC: 犠打 (Sacrifice Bunt)
- SF: 犠飛 (Sacrifice Fly)
- BB: 四球 (Base on Balls)
- HBP: 死球 (Hit By Pitch)
- E: エラー (Error)
- FC: フィールダーチョイス (Fielder's Choice)
- OTH: その他 (Other)

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## 技術スタック

- React
- TypeScript
- Material UI
- UUID
