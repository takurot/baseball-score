---
title: 野球スコアアプリ UI 改善 実装計画 v2.0（改善版）
language: ja
version: 2.0
date: 2025-10-04
base_version: v1.0
assumptions:
  - 対象は `src/App.tsx` 配下のSPA（MUI v6.5.0）
  - 主要フロー: 試合の作成/入力、チーム管理、試合一覧、共有閲覧
  - デバイス幅: 375 / 768 / 1280 を優先検証
  - ブランディング: シンプル・スピーディ・信頼感
  - 非目標: リブランディング、技術基盤の大規模刷新
references:
  - Apple HIG, Material 3, WCAG 2.2 AA, Core Web Vitals
changelog:
  - v1.0からの主な変更点:
      - PR構成の再編成（依存関係の最適化）
      - デザイントークンの具体的な定義を追加
      - 各PRに定量的な受け入れ基準を明記
      - テスト戦略の詳細化
      - ロールバック計画の明確化
      - MUI v6の機能を活用した実装ガイドを追加
---

## 1. エグゼクティブサマリー

### 1.1 評価結果（v1.0計画の課題）

| 観点           | スコア | 課題                                                     |
| -------------- | :----: | -------------------------------------------------------- |
| 構造・優先順位 |  3/4   | PR依存関係が複雑化しやすい、トークン定義が抽象的         |
| 実装可能性     |  3/4   | MUI v6の新機能活用が不足、具体的なコード例がない         |
| 検証計画       |  2/4   | 定量基準が曖昧、段階的な検証戦略が不足                   |
| リスク管理     |  2/4   | ロールバック手順が抽象的、影響範囲の見積もりが粗い       |
| 総合評価       | 2.5/4  | 方向性は正しいが実装の具体性と検証の厳密性に改善余地あり |

### 1.2 改善方針

1. **段階的アプローチの強化**: トークン→基盤→コンポーネント→最適化の明確な階層化
2. **具体性の向上**: コード例、デザイントークンの数値、具体的なARIA実装パターンを追加
3. **検証の厳密化**: PR毎の定量基準、自動テストの導入タイミング、手動テスト手順を明記
4. **リスク軽減**: 各PRに影響範囲マップ、ロールバック手順、フィーチャーフラグ戦略を追加

---

## 2. 現状分析とスコープ定義

### 2.1 主要課題（現行コードベースより）

| ID    | 画面/機能  | 問題                                   | 重要度 | 根拠                                   |
| ----- | ---------- | -------------------------------------- | :----: | -------------------------------------- |
| C-001 | 全体       | フォーカス可視性の欠如                 |   高   | WCAG 2.4.7, MD Focus States            |
| C-002 | ScoreBoard | テーブル見出しのsemantic markup不足    |   高   | WCAG 1.3.1, HTML5 Table                |
| C-003 | ScoreBoard | console.logが本番コードに残存          |   中   | パフォーマンス影響、セキュリティリスク |
| C-004 | AtBatForm  | 色だけで情報分類（カテゴリー）         |   高   | WCAG 1.4.1 色のみに依存しない          |
| C-005 | AtBatForm  | aria-invalid, aria-describedbyの欠如   |   高   | WCAG 3.3.1/3.3.3 エラー識別            |
| C-006 | AppBar     | アイコンボタンのaria-label未設定       |   高   | WCAG 4.1.2 Name, Role, Value           |
| C-007 | 全体       | モバイルでのタップ領域が不明瞭         |   中   | HIG 44pt, MD 48dp                      |
| C-008 | 共有モード | 状態と制約の説明不足                   |   中   | Nielsen #1 Status Visibility           |
| C-009 | 全体       | 非同期操作の状態表示が不統一           |   中   | Nielsen #1, MD Progress                |
| C-010 | ScoreBoard | 横スクロール可能性の視覚的手掛かり不足 |   低   | UX Best Practice                       |

### 2.2 改善目標（定量）

| 指標                            | 現状推定  |  目標  | 根拠                 |
| ------------------------------- | :-------: | :----: | -------------------- |
| Lighthouse Accessibility        |   75-80   |  ≥95   | WCAG 2.2 AA準拠      |
| Lighthouse Performance          |   60-70   |  ≥85   | Core Web Vitals      |
| WAVE Errors                     |   10-15   |   0    | アクセシビリティ必須 |
| axe-core Violations (Critical)  |   5-10    |   0    | 同上                 |
| INP (Interaction to Next Paint) | 300-500ms | <200ms | Core Web Vitals      |
| CLS (Cumulative Layout Shift)   | 0.15-0.25 |  <0.1  | 同上                 |
| キーボード操作成功率            |    60%    |  ≥95%  | ユーザビリティ       |

---

## 3. デザイントークン定義（PR-01の基盤）

### 3.1 Themeの拡張仕様

```typescript
// src/theme/tokens.ts（新規作成）
import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    accessibility: {
      focusVisible: {
        outline: string;
        outlineOffset: string;
        borderRadius: string;
      };
      touchTarget: {
        minHeight: string;
        minWidth: string;
      };
    };
  }
  interface ThemeOptions {
    accessibility?: {
      focusVisible?: {
        outline?: string;
        outlineOffset?: string;
        borderRadius?: string;
      };
      touchTarget?: {
        minHeight?: string;
        minWidth?: string;
      };
    };
  }
}

export const accessibilityTokens: ThemeOptions['accessibility'] = {
  focusVisible: {
    outline: '2px solid', // WCAG 2.4.7 推奨
    outlineOffset: '2px', // 視認性向上
    borderRadius: '4px', // Material 3 準拠
  },
  touchTarget: {
    minHeight: '48px', // Material 3 / 44pt HIG
    minWidth: '48px',
  },
};
```

### 3.2 コンポーネントレベルのデフォルト設定

```typescript
// MUI Themeのcomponentsオーバーライド
components: {
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        minHeight: theme.accessibility.touchTarget.minHeight,
        minWidth: theme.accessibility.touchTarget.minWidth,
        '&:focus-visible': {
          outline: `${theme.accessibility.focusVisible.outline} ${theme.palette.primary.main}`,
          outlineOffset: theme.accessibility.focusVisible.outlineOffset,
          borderRadius: theme.accessibility.focusVisible.borderRadius,
        },
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        minHeight: theme.accessibility.touchTarget.minHeight,
        minWidth: theme.accessibility.touchTarget.minWidth,
        '&:focus-visible': {
          outline: `${theme.accessibility.focusVisible.outline} ${theme.palette.primary.main}`,
          outlineOffset: theme.accessibility.focusVisible.outlineOffset,
        },
      }),
    },
  },
  // ... TabButton, ListItem, MenuItemなど
}
```

---

## 4. PR分割計画（v2.0 改訂版）

### 【Phase 1: 基盤整備】

#### PR-01: デザイントークンとテーマ拡張（最優先）

**目的**: アクセシビリティとタッチ操作性の基盤構築

**変更ファイル**:

- 新規: `src/theme/tokens.ts`, `src/theme/index.ts`
- 変更: `src/App.tsx` (getTheme関数の置き換え)

**実装内容**:

1. アクセシビリティトークンの定義（上記3.1, 3.2参照）
2. フォーカス可視化スタイルの全コンポーネント適用
3. タッチターゲットの最小サイズ保証
4. コントラスト比の検証（背景との比率≥3:1）

**受け入れ条件**:

- [ ] テーマ型定義がTypeScriptでエラーなし
- [ ] Storybookで全ボタン/リンクのフォーカス状態が視認可能
- [ ] モバイルシミュレータでタップ領域が≥48x48px
- [ ] axe-core で focus-visible 関連エラー 0件

**工数**: 1.0日  
**リスク**: 既存スタイルとの衝突 → `!important`回避、CSS詳細度の調整  
**ロールバック**: テーマファイルのみ削除/旧getTheme復帰で即時可能

---

#### PR-02: 自動テスト基盤の導入（並行作業可）

**目的**: 継続的品質保証とリグレッション防止

**変更ファイル**:

- 新規: `.github/workflows/a11y-check.yml`
- 新規: `src/setupTests.ts` (axe設定)
- 変更: `package.json` (devDependencies追加)

**導入ツール**:

```json
"devDependencies": {
  "@axe-core/react": "^4.8.0",
  "jest-axe": "^8.0.0",
  "lighthouse-ci": "^0.12.0",
  "@testing-library/jest-dom": "^6.8.0" // 既存
}
```

**実装内容**:

1. `jest-axe`によるユニットテスト拡張
2. Lighthouse CI（GitHub Actions）
3. 主要コンポーネントのアクセシビリティテスト作成
   - ScoreBoard: テーブルセマンティクス
   - AtBatForm: フォーム検証とラベル
   - AppBar: ナビゲーション構造

**受け入れ条件**:

- [ ] PR作成時にLighthouse CIが自動実行
- [ ] A11y score < 95 の場合はCI失敗
- [ ] jest-axeテストが3コンポーネント以上でパス

**工数**: 1.5日  
**リスク**: CI実行時間の増加 → キャッシュ戦略の最適化  
**依存**: なし（Phase 1並行作業）

---

### 【Phase 2: Critical Path修正】

#### PR-03: ScoreBoardのアクセシビリティ改善

**目的**: データテーブルのWCAG準拠とモバイル操作性向上

**変更ファイル**:

- 変更: `src/components/ScoreBoard.tsx`

**実装内容**:

1. **セマンティックマークアップ**:

   ```tsx
   <TableCell component="th" scope="col">チーム</TableCell>
   <TableCell component="th" scope="row">{awayTeam.name}</TableCell>
   ```

2. **横スクロールインジケータ**:

   ```tsx
   // TableContainerにグラデーションオーバーレイ追加
   '&::after': {
     content: '""',
     position: 'absolute',
     right: 0,
     top: 0,
     height: '100%',
     width: '30px',
     background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
     pointerEvents: 'none',
     opacity: isScrollable ? 1 : 0, // スクロール可能時のみ表示
   }
   ```

3. **現在イニングの強調**:
   - 背景色差分を4.5:1以上に
   - aria-currentの付与

4. **不要なconsole.log削除**: 80-105行目

5. **合計列の説明強化**:
   ```tsx
   <TableCell aria-label="合計得点">R</TableCell>
   ```

**受け入れ条件**:

- [ ] WAVE でテーブルエラー 0件
- [ ] スクリーンリーダー（NVDA）で見出しと合計が正しく読み上げ
- [ ] 横スクロール時にグラデーションが表示
- [ ] 現在イニングのコントラスト比≥4.5:1（テキスト）
- [ ] console.logがコード内に0件

**工数**: 0.75日  
**依存**: PR-01（フォーカススタイル）  
**ロールバック**: コンポーネント単体のrevert

---

#### PR-04: AtBatFormの入力支援とエラープリベンション

**目的**: フォームアクセシビリティとユーザーエラー削減

**変更ファイル**:

- 変更: `src/components/AtBatForm.tsx`

**実装内容**:

1. **色以外の情報提供**（WCAG 1.4.1対応）:

   ```tsx
   // カテゴリーごとにアイコン/プレフィックスを追加
   <ListSubheader>
     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
       <CheckCircleIcon fontSize="small" sx={{ color: customColors.hit }} />
       <span>ヒット</span>
     </Box>
   </ListSubheader>
   ```

2. **ARIA属性の追加**:

   ```tsx
   <Select
     value={result}
     onChange={...}
     label="打席結果"
     required
     aria-required="true"
     aria-invalid={validationError ? 'true' : 'false'}
     aria-describedby="result-helper-text"
   />
   <FormHelperText id="result-helper-text">
     打席の結果を選択してください
   </FormHelperText>
   ```

3. **送信後のフィードバック**:

   ```tsx
   // 登録成功時
   <div role="status" aria-live="polite" aria-atomic="true">
     {successMessage}
   </div>
   ```

4. **編集キャンセル時のフォーカス管理**:
   ```tsx
   const cancelButtonRef = useRef<HTMLButtonElement>(null);
   const handleCancel = () => {
     onCancelEdit();
     cancelButtonRef.current?.focus();
   };
   ```

**受け入れ条件**:

- [ ] キーボードのみで全フィールド操作可能
- [ ] エラー状態でaria-invalidが適切に設定
- [ ] カテゴリーがアイコン+テキストで識別可能
- [ ] 送信後のメッセージがスクリーンリーダーで読み上げ
- [ ] jest-axe テスト合格

**工数**: 1.0日  
**依存**: PR-01  
**ロールバック**: コンポーネント単体のrevert

---

#### PR-05: AppBarのナビゲーションとARIA改善

**目的**: グローバルナビゲーションのアクセシビリティ完全準拠

**変更ファイル**:

- 変更: `src/App.tsx` (AppBar セクション, 約200-400行目)

**実装内容**:

1. **ランドマークロールの明示**:

   ```tsx
   <AppBar position="static" component="nav" role="navigation" aria-label="メインナビゲーション">
   ```

2. **アイコンボタンのラベル**:

   ```tsx
   <IconButton
     onClick={handleMenuOpen}
     aria-label="メニューを開く"
     aria-controls={menuOpen ? 'main-menu' : undefined}
     aria-expanded={menuOpen ? 'true' : 'false'}
     aria-haspopup="true"
   >
     <MenuIcon />
   </IconButton>
   ```

3. **共有モード状態表示**:

   ```tsx
   {
     isSharedMode && (
       <Box
         sx={{ bgcolor: 'warning.light', px: 2, py: 0.5 }}
         role="status"
         aria-live="polite"
       >
         <Typography variant="caption">
           閲覧専用モード（編集・保存はできません）
         </Typography>
       </Box>
     );
   }
   ```

4. **Tab要素のアクセシビリティ**:
   ```tsx
   <Tabs
     value={tabValue}
     onChange={handleTabChange}
     aria-label="メイン機能タブ"
   >
     <Tab label="試合記録" id="tab-0" aria-controls="tabpanel-0" />
     <Tab label="チーム管理" id="tab-1" aria-controls="tabpanel-1" />
     ...
   </Tabs>
   ```

**受け入れ条件**:

- [ ] 全アイコンボタンにaria-label設定
- [ ] メニューの開閉状態がaria-expandedで伝達
- [ ] 共有モードバナーがスクリーンリーダーで読み上げ
- [ ] キーボードTab順序が論理的（左→右、上→下）
- [ ] WAVE のARIAエラー 0件

**工数**: 1.0日  
**依存**: PR-01  
**ロールバック**: AppBar部分のみrevert（影響範囲限定）

---

### 【Phase 3: 状態管理と操作性】

#### PR-06: 非同期操作の状態表示統一

**目的**: ローディング・エラー・成功状態の一貫した伝達

**変更ファイル**:

- 変更: `src/App.tsx` (保存/読込関数)
- 新規: `src/components/LoadingButton.tsx` (共通化)

**実装内容**:

1. **LoadingButton コンポーネント**:

   ```tsx
   interface LoadingButtonProps extends ButtonProps {
     loading: boolean;
     loadingText?: string;
   }

   const LoadingButton: React.FC<LoadingButtonProps> = ({
     loading,
     loadingText = '処理中...',
     children,
     disabled,
     ...props
   }) => (
     <Button
       {...props}
       disabled={disabled || loading}
       startIcon={loading ? <CircularProgress size={20} /> : props.startIcon}
       aria-busy={loading}
       aria-live="polite"
     >
       {loading ? loadingText : children}
     </Button>
   );
   ```

2. **Snackbarの統一**:

   ```tsx
   <Snackbar
     open={snackbar.open}
     autoHideDuration={6000}
     onClose={handleSnackbarClose}
   >
     <Alert
       severity={snackbar.severity}
       role={snackbar.severity === 'error' ? 'alert' : 'status'}
       aria-live={snackbar.severity === 'error' ? 'assertive' : 'polite'}
     >
       {snackbar.message}
     </Alert>
   </Snackbar>
   ```

3. **冪等性の保証**:
   - 保存中は再クリック無効化
   - リトライボタンの明示

**受け入れ条件**:

- [ ] ローディング中のボタンがaria-busy="true"
- [ ] エラー時のSnackbarがaria-live="assertive"
- [ ] 連続クリックで重複送信が発生しない
- [ ] ローディング状態が視覚・音声両方で伝達

**工数**: 0.75日  
**依存**: PR-01  
**ロールバック**: LoadingButton未使用に戻す

---

#### PR-07: HelpDialogと共有モードガイダンス拡充

**目的**: ユーザーオンボーディングと状況理解の支援

**変更ファイル**:

- 変更: `src/components/HelpDialog.tsx`
- 変更: `src/App.tsx` (共有モードUI)

**実装内容**:

1. **共有モード専用セクション追加**
2. **ダイアログのARIA改善**:

   ```tsx
   <Dialog
     open={open}
     onClose={onClose}
     aria-labelledby="help-dialog-title"
     aria-describedby="help-dialog-description"
   >
     <DialogTitle id="help-dialog-title">ヘルプ</DialogTitle>
     <DialogContent id="help-dialog-description">...</DialogContent>
   </Dialog>
   ```

3. **キーボードショートカット案内**

**受け入れ条件**:

- [ ] Escキーでダイアログクローズ
- [ ] フォーカスが開く前の要素に戻る
- [ ] 共有モード説明がわかりやすい（ユーザビリティテスト）

**工数**: 0.5日  
**依存**: PR-05（共有モード基盤）

---

### 【Phase 4: パフォーマンス最適化】

#### PR-08: Core Web Vitals最適化

**目的**: LCP/INP/CLSの目標達成

**変更ファイル**:

- 変更: `src/App.tsx` (遅延ロード)
- 変更: `src/components/ScoreBoard.tsx` (メモ化)
- 変更: `src/components/AtBatForm.tsx` (同上)

**実装内容**:

1. **コンポーネントの遅延ロード**:

   ```tsx
   const HelpDialog = lazy(() => import('./components/HelpDialog'));
   const TeamStatsList = lazy(() => import('./components/TeamStatsList'));
   ```

2. **メモ化の適用**:

   ```tsx
   const MemoizedScoreBoard = React.memo(ScoreBoard);

   // ScoreBoard内部
   const calculatedScores = useMemo(
     () => ({
       awayTotal: calculateTotalScore(awayTeam, true),
       homeTotal: calculateTotalScore(homeTeam, false),
     }),
     [awayTeam, homeTeam, runEvents]
   );
   ```

3. **不要な再レンダリング削減**:
   - useCallback for handlers
   - 状態の適切な分割

4. **画像最適化**（該当する場合）:
   - loading="lazy"
   - srcset対応

**受け入れ条件**:

- [ ] Lighthouse Performance ≥ 85
- [ ] INP < 200ms (3回測定の中央値)
- [ ] CLS < 0.1
- [ ] FCP < 1.8s
- [ ] 主要タスク実行時の体感速度向上（定性評価）

**工数**: 1.0日  
**依存**: PR-03, PR-04（主要コンポーネント改修完了後）  
**ロールバック**: メモ化削除でも機能に影響なし

---

## 5. 実装ガイドライン

### 5.1 コーディング規約

- **ARIA使用の原則**: セマンティックHTMLで不足する場合のみ使用
- **フォーカス管理**: useRef + focus() でプログラマティック制御
- **色彩依存の禁止**: 情報はアイコン/テキスト/パターンで補完
- **エラーメッセージ**: 具体的な修正方法を提示

### 5.2 MUI v6 活用推奨パターン

- `theme.applyStyles()` による条件スタイル
- `useMediaQuery` によるレスポンシブ分岐
- `sx` prop の積極活用（パフォーマンス最適化済み）

### 5.3 禁止事項

- `!important` の使用（theme競合時は詳細度で解決）
- `console.log/warn/error` の本番コード残留
- `div` でクリッカブル要素作成（`button` 必須）

---

## 6. 検証計画（詳細版）

### 6.1 自動テスト（CI/CD）

| ツール          | 実行タイミング | 合格基準         | 備考            |
| --------------- | -------------- | ---------------- | --------------- |
| jest + jest-axe | PR作成時       | 全テスト合格     | ユニットテスト  |
| Lighthouse CI   | PR作成時       | A11y≥95, Perf≥85 | headlessモード  |
| axe DevTools    | ローカル開発時 | Critical 0件     | ブラウザ拡張    |
| TypeScript      | コミット前     | エラー 0件       | pre-commit hook |

### 6.2 手動テスト（PR毎）

**キーボード操作テスト**:

1. Tabキーで全操作要素を巡回（10分）
2. Enterでアクション実行、Escでキャンセル
3. フォーカスの視認性確認

**スクリーンリーダーテスト** (NVDA / VoiceOver):

1. ランドマークナビゲーション（main, nav, formなど）
2. テーブルの見出し読み上げ
3. フォームエラーの読み上げ

**モバイル実機テスト** (iPhone 13, Android中価格帯):

1. タップ領域の快適性
2. 横スクロールの発見しやすさ
3. ソフトキーボード表示時のレイアウト崩れ

### 6.3 ユーザビリティテスト（Phase完了毎）

**タスク例**:

- タスク1: 新しい試合を作成しスコアを3イニング記録（目標: 90秒以内）
- タスク2: 既存の打席結果を修正（目標: 30秒以内）
- タスク3: 共有URLから試合結果を閲覧（目標: 迷わず完了）

**参加者**: 野球経験者5名（うち2名はアクセシビリティニーズあり）

**成功基準**:

- タスク成功率 ≥ 90%
- 平均SUS（System Usability Scale）スコア ≥ 75

---

## 7. リスク管理とロールバック

### 7.1 影響範囲マップ

| PR    | 影響コンポーネント数 | 影響ファイル数 | リグレッションリスク |
| ----- | :------------------: | :------------: | :------------------: |
| PR-01 |         全体         |       2        |   高（テーマ変更）   |
| PR-02 |          0           |       5        |   低（テストのみ）   |
| PR-03 |          1           |       1        |          低          |
| PR-04 |          1           |       1        |          低          |
| PR-05 |          1           |       1        | 中（グローバルナビ） |
| PR-06 |          2           |       3        |          低          |
| PR-07 |          1           |       2        |          低          |
| PR-08 |          5           |       5        | 中（パフォーマンス） |

### 7.2 ロールバック手順

**PR-01の場合（最もリスク高）**:

1. `src/theme/` ディレクトリを削除
2. `src/App.tsx` の `getTheme` 関数を旧バージョンに復元
3. `npm run build` で確認
4. git revert + push

**その他PR**:

- 単一ファイル変更が多いため `git revert <commit-hash>` で即座に復旧可能

### 7.3 フィーチャーフラグ戦略（オプション）

PR-01（テーマ）に限り、環境変数での切替を検討:

```typescript
const USE_NEW_THEME = process.env.REACT_APP_NEW_THEME === 'true';
const theme = useMemo(
  () => (USE_NEW_THEME ? getNewTheme(mode) : getTheme(mode)),
  [mode]
);
```

---

## 8. 工数とスケジュール

### 8.1 総工数見積もり

| Phase    | PR数  | 工数合計  | 期間（1人） | 期間（2人） |
| -------- | :---: | :-------: | :---------: | :---------: |
| Phase 1  |   2   |   2.5日   |    1週間    |    3-4日    |
| Phase 2  |   3   |  2.75日   |    1週間    |    3-4日    |
| Phase 3  |   2   |  1.25日   |   0.5週間   |    1-2日    |
| Phase 4  |   1   |   1.0日   |   0.5週間   |     1日     |
| **合計** | **8** | **7.5日** |  **3週間**  | **1.5週間** |

※ 各PRのレビュー・修正時間込み  
※ ユーザビリティテストは別途1日/Phase

### 8.2 推奨スケジュール（2人体制）

```
Week 1: PR-01完成 → PR-02着手（並行）→ PR-03, 04着手
Week 2: PR-03, 04完成 → PR-05着手 → Phase 2 UT実施
Week 3: PR-06, 07完成 → PR-08着手 → 最終検証
```

---

## 9. 成果物とドキュメント

### 9.1 各PR提出時の必須ドキュメント

- [ ] CHANGELOG.md への変更点記載
- [ ] コンポーネントのStorybook（主要PRのみ）
- [ ] アクセシビリティチェックリスト（テンプレート使用）
- [ ] スクリーンショット（Before/After）
- [ ] Lighthouse/axeレポート

### 9.2 最終成果物

- [ ] 改善報告書（スコア改善のサマリー）
- [ ] アクセシビリティ適合レポート（WCAG 2.2 AA）
- [ ] パフォーマンス測定レポート
- [ ] 継続的改善ガイド（今後のチェックリスト）

---

## 10. 継続的改善とモニタリング

### 10.1 定期的な監視項目

- 週次: Lighthouse CI のトレンド確認
- 月次: Real User Monitoring (RUM) によるCore Web Vitals
- 四半期: ユーザビリティテストの再実施

### 10.2 今後の改善候補（Phase 2）

- オフライン対応（Service Worker）
- PWA対応（installable）
- 多言語対応（i18n）
- ダークモードの最適化
- より高度なアニメーション（Framer Motion）

### 10.3 中長期的構造改善（Phase 2+）

**背景**: テストカバレッジ分析（v3.0計画より）により、以下の構造的課題が判明：

```
現状のカバレッジ: 6%
├─ App.tsx: 1,707行 (0%カバー) ← 最大のボトルネック
├─ Firebase系: 1,095行 (0%カバー) ← モック困難
├─ 大規模UI: 2,500行+ (0%カバー) ← 統合テスト不足
└─ 小規模コンポーネント: 高カバレッジ達成済み
```

**課題の本質**:

1. ✗ **ビジネスロジックとUIの密結合** → テスト困難
2. ✗ **巨大なコンポーネント** → 変更影響範囲が大きい
3. ✗ **Firebase直接依存** → モックが複雑

#### 10.3.1 App.tsx のリファクタリング（優先度: 高）

**目的**: 1,707行の巨大ファイルをテスト可能な単位に分割

**工数見積**: 3日間

**改善案**:

1. **カスタムHooksへの分割**:

   ```typescript
   // src/hooks/useGameState.ts (新規作成)
   export const useGameState = (initialGame?: Game) => {
     const [homeTeam, setHomeTeam] = useState<Team>(/* ... */);
     const [awayTeam, setAwayTeam] = useState<Team>(/* ... */);
     const [currentInning, setCurrentInning] = useState(1);
     const [isTop, setIsTop] = useState(true);

     const addAtBat = useCallback((atBat: AtBat) => {
       // ビジネスロジック
     }, [homeTeam, awayTeam]);

     return {
       homeTeam,
       awayTeam,
       currentInning,
       isTop,
       addAtBat,
       // ... その他の操作
     };
   };

   // src/hooks/useTeamManagement.ts (新規作成)
   export const useTeamManagement = () => {
     // チームの作成・編集・削除ロジック
   };

   // src/hooks/useScoreCalculation.ts (新規作成)
   export const useScoreCalculation = (
     homeTeam: Team,
     awayTeam: Team,
     runEvents: RunEvent[]
   ) => {
     // スコア計算ロジック
   };
   ```

2. **ビジネスロジックのサービス層分離**:

   ```typescript
   // src/services/scoreCalculator.ts (新規作成)
   export class ScoreCalculator {
     static calculateInningScore(
       team: Team,
       inning: number,
       isTop: boolean
     ): number {
       // 純粋関数化されたスコア計算
     }

     static calculateTotalScore(
       team: Team,
       runEvents: RunEvent[]
     ): number {
       // 合計スコア計算
     }
   }

   // src/services/inningManager.ts (新規作成)
   export class InningManager {
     static getNextInning(
       current: number,
       isTop: boolean,
       maxInnings: number
     ): { inning: number; isTop: boolean } {
       // イニング進行ロジック
     }
   }
   ```

3. **状態管理の最適化** (Optional):
   ```typescript
   // Zustand or Jotaiの導入検討
   // より細かい粒度での状態管理
   ```

**期待効果**:

- ✅ テストカバレッジ: 0% → 60%以上
- ✅ 変更影響範囲の明確化
- ✅ 並行開発の容易性向上
- ✅ コードレビューの効率化

**リスク**:

- 大規模なリファクタリングによる一時的な不安定化
- 既存の暗黙的な依存関係の顕在化

**軽減策**:

- フィーチャーフラグによる段階的移行
- 既存コードを残しつつ新実装を並行稼働
- 広範な統合テストの事前実施

---

#### 10.3.2 Firebase依存の抽象化（優先度: 中）

**目的**: テスト容易性とプラットフォーム非依存性の向上

**工数見積**: 2日間

**改善案**:

1. **Repositoryパターンの導入**:

   ```typescript
   // src/repositories/GameRepository.ts (新規作成)
   export interface IGameRepository {
     save(game: Game, userId: string): Promise<string>;
     load(gameId: string): Promise<Game | null>;
     list(userId: string): Promise<Game[]>;
     delete(gameId: string): Promise<void>;
   }

   // src/repositories/FirebaseGameRepository.ts (新規作成)
   export class FirebaseGameRepository implements IGameRepository {
     private firestore: Firestore;

     constructor(firestore: Firestore) {
       this.firestore = firestore;
     }

     async save(game: Game, userId: string): Promise<string> {
       // Firebase実装
     }

     // ... その他のメソッド
   }

   // src/repositories/MockGameRepository.ts (テスト用)
   export class MockGameRepository implements IGameRepository {
     private storage: Map<string, Game> = new Map();

     async save(game: Game, userId: string): Promise<string> {
       const id = `mock-${Date.now()}`;
       this.storage.set(id, game);
       return id;
     }

     // ... その他のメソッド
   }
   ```

2. **Dependency Injectionの導入**:

   ```typescript
   // src/contexts/RepositoryContext.tsx (新規作成)
   export const RepositoryContext = createContext<{
     gameRepository: IGameRepository;
     teamRepository: ITeamRepository;
     statsRepository: IStatsRepository;
   } | null>(null);

   export const RepositoryProvider: React.FC<{
     children: React.ReactNode;
     repositories?: {
       /* ... */
     };
   }> = ({ children, repositories }) => {
     const defaultRepositories = useMemo(
       () => ({
         gameRepository:
           repositories?.gameRepository ||
           new FirebaseGameRepository(firestore),
         // ... その他
       }),
       [repositories]
     );

     return (
       <RepositoryContext.Provider value={defaultRepositories}>
         {children}
       </RepositoryContext.Provider>
     );
   };

   // 使用例
   export const useGameRepository = () => {
     const context = useContext(RepositoryContext);
     if (!context) {
       throw new Error('useGameRepository must be used within RepositoryProvider');
     }
     return context.gameRepository;
   };
   ```

3. **テストでの利用**:
   ```typescript
   // App.test.tsx
   import { MockGameRepository } from './repositories/MockGameRepository';

   test('試合を保存できる', async () => {
     const mockRepo = new MockGameRepository();

     render(
       <RepositoryProvider
         repositories={{ gameRepository: mockRepo }}
       >
         <App />
       </RepositoryProvider>
     );

     // テスト実行（Firebaseモック不要）
   });
   ```

**期待効果**:

- ✅ Firebase Emulator不要でテスト実行可能
- ✅ テスト実行速度の大幅向上（50倍以上）
- ✅ プラットフォーム変更時の影響範囲限定
- ✅ カバレッジ: Firebase系サービス 0% → 80%以上

**リスク**:

- 抽象化レイヤーの複雑性増加
- 既存コードの大規模な書き換え

**軽減策**:

- まず1つのRepositoryで実証
- 既存サービスをラップする形で段階的移行
- インターフェース設計のレビュー強化

---

#### 10.3.3 統合テスト基盤の構築（優先度: 中）

**目的**: E2Eテストによる品質保証の強化

**工数見積**: 2日間

**改善案**:

1. **Playwrightの導入**:

   ```typescript
   // e2e/game-flow.spec.ts (新規作成)
   import { test, expect } from '@playwright/test';

   test('試合作成から保存までのフロー', async ({ page }) => {
     // ログイン
     await page.goto('/');
     await page.click('text=ログイン');
     // ... 認証フロー

     // 試合作成
     await page.click('text=新しい試合');
     await page.fill('[name="home-team"]', 'ホークス');
     await page.fill('[name="away-team"]', 'タイガース');

     // 打席記録
     await page.click('text=打席を追加');
     await page.selectOption('[name="result"]', 'IH');
     await page.click('text=登録');

     // 保存確認
     await page.click('text=保存');
     await expect(page.locator('text=保存しました')).toBeVisible();
   });
   ```

2. **Visual Regression Testing** (Optional):

   ```typescript
   // スクリーンショット比較による視覚的リグレッション検出
   await expect(page).toHaveScreenshot('score-board.png');
   ```

3. **CI/CDへの統合**:
   ```yaml
   # .github/workflows/e2e.yml
   name: E2E Tests
   on: [pull_request]
   jobs:
     e2e:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npx playwright install
         - run: npm run test:e2e
   ```

**期待効果**:

- ✅ クリティカルパスの自動検証
- ✅ リグレッション検出の早期化
- ✅ 全体フローのカバレッジ向上

---

#### 10.3.4 実装スケジュール（段階的アプローチ）

**Phase 2a: 実証とプロトタイプ（2週間）**

```
Week 1-2:
  - App.tsxから1つのカスタムHookを抽出（useGameState）
  - 1つのRepositoryを実装（GameRepository）
  - テストカバレッジ効果の測定
  → 効果が確認できれば本格展開
```

**Phase 2b: 本格展開（4週間）**

```
Week 3-4:
  - 残りのカスタムHooks実装
  - ビジネスロジックのサービス層分離
  - テストカバレッジ: 20% → 40%

Week 5-6:
  - 全Repositoryの実装
  - 既存コードの段階的移行
  - テストカバレッジ: 40% → 60%
```

**Phase 2c: 品質強化（2週間）**

```
Week 7-8:
  - E2Eテスト実装
  - 統合テストの拡充
  - テストカバレッジ: 60% → 70%
  - ドキュメント整備
```

**総工数**: 8週間（1人）または 4週間（2人）

---

#### 10.3.5 投資対効果（ROI）分析

**初期投資**: 8週間（約160時間）

**期待効果**:

| 指標                       | 現状   | 改善後  | 改善率  |
| -------------------------- | ------ | ------- | ------- |
| テストカバレッジ           | 6%     | 70%     | +1,067% |
| バグ検出時間               | 数日   | 数分    | -99%    |
| 新機能開発速度             | 基準   | 1.5倍   | +50%    |
| リファクタリングの安全性   | 低     | 高      | +++     |
| 新メンバーのオンボード時間 | 2週間  | 3日     | -85%    |
| デプロイ時の不安度         | 高     | 低      | ---     |
| 技術的負債の蓄積速度       | 速い   | 遅い    | ---     |

**年間換算の効果**:

- バグ修正時間削減: 40時間/年 → 160時間の投資は**4ヶ月で回収**
- 開発速度向上: 50%のスピードアップ → 年間200時間の追加開発時間
- 品質向上による顧客満足度とNPSの向上（定量化困難）

**結論**: **投資する価値は極めて高い**

---

#### 10.3.6 段階的移行の実践例

**ステップ1: 小規模から開始**

```typescript
// まず、最も独立性の高いuseScoreCalculationを抽出

// Before (App.tsx内)
const calculateTotalScore = (team: Team, isAway: boolean) => {
  // 複雑なロジック
};

// After (hooks/useScoreCalculation.ts)
export const useScoreCalculation = (
  homeTeam: Team,
  awayTeam: Team,
  runEvents: RunEvent[]
) => {
  const calculateTotalScore = useCallback((team: Team, isAway: boolean) => {
    // 同じロジック（テスト可能）
  }, [runEvents]);

  return { calculateTotalScore };
};

// App.tsx
const { calculateTotalScore } = useScoreCalculation(
  homeTeam,
  awayTeam,
  runEvents
);
```

**ステップ2: テストを書く**

```typescript
// hooks/__tests__/useScoreCalculation.test.ts
import { renderHook } from '@testing-library/react';
import { useScoreCalculation } from '../useScoreCalculation';

describe('useScoreCalculation', () => {
  test('合計スコアを正しく計算する', () => {
    const { result } = renderHook(() =>
      useScoreCalculation(mockHomeTeam, mockAwayTeam, mockRunEvents)
    );

    expect(result.current.calculateTotalScore(mockHomeTeam, false)).toBe(5);
  });
});
```

**ステップ3: カバレッジを確認**

```bash
npm test -- --coverage
# useScoreCalculation: 95%達成！
```

**ステップ4: 次のHookへ**

```
成功体験を元に、次のuseGameStateを抽出...
```

---

#### 10.3.7 参考資料

**アーキテクチャパターン**:

- [Clean Architecture in React](https://dev.to/rubemfsv/clean-architecture-applying-with-react-40h6)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection in React](https://javascript.plainenglish.io/dependency-injection-in-react-a6c3d5d0db76)

**テスト戦略**:

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [React Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

**リファクタリング手法**:

- [Refactoring by Martin Fowler](https://refactoring.com/)
- [Working Effectively with Legacy Code](https://www.goodreads.com/book/show/44919.Working_Effectively_with_Legacy_Code)

---

## 11. 参考資料とチェックリスト

### 11.1 必読ガイドライン

- [MUI Accessibility Guide](https://mui.com/material-ui/guides/accessibility/)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Material Design Accessibility](https://m3.material.io/foundations/accessible-design/overview)
- [Apple HIG - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

### 11.2 PR作成前チェックリスト

- [ ] 新規コンポーネントに jest-axe テスト追加済み
- [ ] すべてのボタン/リンクにアクセス可能な名前がある
- [ ] フォームにラベル/エラーメッセージ設定済み
- [ ] キーボードのみで操作可能
- [ ] 色以外の視覚的手掛かりがある
- [ ] console.log/warn/error が残っていない
- [ ] TypeScript エラー 0件
- [ ] Lighthouse A11y スコア ≥ 95

---

## 付録A: v1.0との差分サマリー

| 改善項目         | v1.0              | v2.0                                 |
| ---------------- | ----------------- | ------------------------------------ |
| デザイントークン | 抽象的な説明      | TypeScript型定義付きの具体的なコード |
| PR構成           | 8個（並行度不明） | 4 Phase / 8 PR（依存関係明確）       |
| 受け入れ基準     | 定性的            | 定量+定性（数値目標）                |
| テスト戦略       | PR-08で一括       | PR-02で基盤構築                      |
| ロールバック計画 | なし              | PR毎の手順記載                       |
| 工数見積もり     | 0.5〜1.5日/PR     | 合計7.5日（レビュー込み）            |
| コード例         | なし              | 各PR毎に実装例                       |
| MUI v6対応       | 未考慮            | v6機能の活用ガイド                   |

---

## 付録B: よくある質問（FAQ）

**Q1: なぜPR-01を最優先にするのか？**  
A: フォーカススタイルとタップ領域はすべてのコンポーネントに影響する基盤であり、後続PRの品質を左右するため。

**Q2: jest-axeとLighthouse CIの違いは？**  
A: jest-axeはコンポーネント単体、Lighthouse CIはページ全体を評価。両方必要。

**Q3: Phase 1完了後に仕様変更があった場合は？**  
A: Phase 2以降は独立性が高いため、影響範囲を見極めて該当PRのみ修正。

**Q4: モバイル実機テストは必須か？**  
A: Phase 2完了時点で1回、最終リリース前に1回の計2回を推奨。シミュレータでは検出できないタップ領域の問題があるため。

---

**承認欄**:

- 作成者: **\*\***\_\_\_**\*\***
- レビュー: **\*\***\_\_\_**\*\***
- 承認日: 2025年10月\_\_日

**バージョン管理**:

- v1.0: 初版（2025-10-03想定）
- v2.0: 本版（2025-10-04）
- v2.1: 中長期的構造改善計画の追加（2025-10-06）- カバレッジ分析に基づくアーキテクチャ改善提案
- 次回更新予定: Phase 1完了後のレトロスペクティブ反映

---

_このドキュメントは実装中に更新されます。最新版は必ずGitリポジトリを参照してください。_
