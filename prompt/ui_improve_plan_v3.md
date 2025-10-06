# UI改善プラン v3.0：品質基盤の強化とUX最適化

## 📋 概要

**作成日**: 2025-10-06  
**バージョン**: 3.0  
**ステータス**: 提案中  
**優先度**: High  
**工数見積**: 3.0日（全Phase）

### v2.0からの変更点

- **スコープ拡大**: UIだけでなく品質基盤全体を強化
- **工数増加**: 0.5日 → 3.0日（テスト・CI/CD強化を含む）
- **優先度変更**: Medium → High（品質・信頼性の向上）

## 🎯 目的

### 主目的

1. **UX最適化**: コンテキストアウェアなUIで直感的な操作性を実現
2. **品質基盤強化**: テストカバレッジとCI/CD品質ゲートの実装
3. **信頼性向上**: 自動監視とエラー検知の仕組み構築

### v2.0の統合的レビュー結果

#### ✅ 達成できたこと

| 項目                 | 状態 | 詳細                     |
| -------------------- | ---- | ------------------------ |
| デザイントークン     | ✅   | アクセシビリティ拡張完了 |
| アクセシビリティ     | ✅   | WCAG 2.2 AA準拠          |
| パフォーマンス最適化 | ✅   | 遅延ロード・メモ化実装   |
| ARIA属性             | ✅   | 主要コンポーネントに適用 |

#### ⚠️ 改善が必要な領域

| ID    | 問題                       | 影響度 | 現状               | 目標                |
| ----- | -------------------------- | ------ | ------------------ | ------------------- |
| Q-001 | テストカバレッジ不足       | 高     | 4-5%（極めて低い） | 60%（現実的目標）   |
| Q-002 | a11yテスト不足             | 高     | 3/15コンポーネント | 8/15以上（53%）    |
| Q-003 | E2Eテスト不在              | 中     | 0件                | 主要フロー3件       |
| Q-004 | CI品質ゲート形骸化         | 高     | メッセージのみ     | 実質的チェック      |
| Q-005 | パフォーマンス監視なし     | 中     | 手動測定のみ       | 自動監視            |
| Q-006 | エラー監視なし             | 中     | なし               | Sentry等の導入      |
| Q-007 | セキュリティスキャン不足   | 中     | npm audit          | CodeQL追加          |
| Q-008 | コンポーネントカタログなし | 低     | なし               | Storybookは優先度低 |

**実測カバレッジ詳細（2025-10-06時点）**:

```json
{
  "lines": {"total": 1585, "covered": 63, "pct": 3.97},
  "functions": {"total": 386, "covered": 20, "pct": 5.18},
  "statements": {"total": 1631, "covered": 66, "pct": 4.04},
  "branches": {"total": 1040, "covered": 48, "pct": 4.61}
}
```

**カバーされている主なコンポーネント**:
- ScoreBoard: 83%（テストあり）
- HelpDialog: 86%（a11yテストあり）

**未カバーの主要コンポーネント**（すべて0%）:
- App.tsx（メインロジック）
- AtBatHistory（コア機能）
- TeamManager（コア機能）
- Login（認証機能）
- 全Firebaseサービス

---

## 📊 v2.0実装状況の詳細分析

### テストカバレッジ分析

**現状**:

```
カバレッジ閾値: 50% (branches, functions, lines, statements)
実測値: 不明（未測定）
a11yテスト: 3/15コンポーネント (20%)
```

**テスト実装状況**:
| コンポーネント | a11y | 単体 | 統合 | 優先度 |
|---------------|------|------|------|--------|
| ScoreBoard | ✅ | ❌ | ❌ | 高 |
| AtBatForm | ✅ | ❌ | ❌ | 高 |
| HelpDialog | ✅ | ❌ | ❌ | 中 |
| AtBatHistory | ❌ | ❌ | ❌ | 高 |
| TeamManager | ❌ | ❌ | ❌ | 高 |
| GameList | ❌ | ❌ | ❌ | 中 |
| TeamList | ❌ | ❌ | ❌ | 中 |
| TeamStatsList | ❌ | ❌ | ❌ | 低 |
| TournamentVenue | ❌ | ❌ | ❌ | 低 |
| LoadingButton | ❌ | ❌ | ❌ | 中 |
| Login | ❌ | ❌ | ❌ | 高 |
| UserProfile | ❌ | ❌ | ❌ | 中 |
| PlayerList | ❌ | ❌ | ❌ | 中 |
| AtBatSummaryTable | ❌ | ❌ | ❌ | 中 |

### CI/CDパイプライン分析

**現状の問題点**:

```yaml
# deployment-check ジョブ
deployment-check:
  name: Deployment Readiness
  runs-on: ubuntu-latest
  needs: [test, build, security-audit]
  if: github.ref == 'refs/heads/main' # mainブランチのみ

  steps:
    - name: Deployment readiness check
      run: |
        echo "✅ All tests passed"      # 実質的なチェックなし
        echo "✅ Build successful"
        echo "✅ Security audit completed"
        echo "🚀 Ready for deployment!"
```

**問題**:

1. 実質的なチェックがない（echoのみ）
2. 品質メトリクスの検証なし
3. カバレッジ閾値のチェックなし
4. バンドルサイズの監視なし
5. パフォーマンス回帰の検出なし

---

## 🎯 改善提案（拡張版）

v2.0で提案したUIの改善に加えて、品質基盤の強化を追加します。

## 🐛 現状の問題点

### 問題1: 無関係なボタンが常に表示される

**現象**:

- 選手管理画面でも「日付」「保存」「一覧表示」ボタンが表示される
- 通算成績画面でも同様にこれらのボタンが表示される
- 試合一覧画面でも表示される（新規作成のみが有効）

**影響**:

- ユーザーが混乱する（「このボタンは何をするの？」）
- クリックしても意図しない動作をする可能性
- UIが煩雑に見える

### 問題2: コンテキストが不明確

**現象**:

- どの画面にいるかが、ボタンの表示からは判断しにくい
- AppBarのタイトルは常に「野球スコア」で変わらない

**影響**:

- ユーザーが現在の画面を見失う
- ナビゲーションが直感的でない

## ✅ 改善提案

### 提案1: コンテキストに応じたボタン表示（実装実態に即した整理）

#### 画面モード別のボタン表示

| 画面モード       | 日付 | 保存 | 一覧表示 | ダークモード | ヘルプ | メニュー |
| ---------------- | ---- | ---- | -------- | ------------ | ------ | -------- |
| 試合入力（通常） | ✅   | ✅   | ✅       | ✅           | ✅     | ✅       |
| 試合一覧         | ❌   | ❌   | ❌       | ✅           | ✅     | ✅       |
| 選手管理         | ❌   | ❌   | ❌       | ✅           | ✅     | ✅       |
| 通算成績         | ❌   | ❌   | ❌       | ✅           | ✅     | ✅       |
| 共有モード       | ❌   | ❌   | ✅       | ✅           | ✅     | ❌       |

**理由**:

- **日付**: 試合入力時のみ必要（試合データに紐づく）
- **保存**: 試合入力時のみ必要（試合データを保存）
- **一覧表示**: 試合入力時は編集/一覧の切り替え、共有モードでは成績閲覧
- **ダークモード**: 全画面で有効（ユーザー設定）
- **ヘルプ**: 全画面で有効（操作説明）
- **メニュー**: 通常モードで有効（ナビゲーション）

### 提案2: 画面タイトルの動的変更

#### タイトル表示ルール

```tsx
const getPageTitle = () => {
  if (isSharedMode) return '野球スコア（閲覧専用）';
  if (showGameList) return '試合一覧';
  if (showTeamManagement) return '選手管理';
  if (showTeamStats) return '通算成績';
  return '野球スコア'; // 試合入力画面
};
```

**効果**:

- ユーザーが現在の画面を明確に把握できる
- パンくずリスト的な役割を果たす

### 提案3: 「戻る」ボタンの追加

#### 実装案

試合一覧、選手管理、通算成績の各画面に「戻る」ボタンを表示：

```tsx
{
  (showGameList || showTeamManagement || showTeamStats) && (
    <IconButton
      color="inherit"
      onClick={handleBackToGame}
      aria-label="試合画面に戻る"
    >
      <ArrowBackIcon />
    </IconButton>
  );
}
```

**効果**:

- 直感的なナビゲーション
- ユーザーが迷わず試合画面に戻れる
- モバイルアプリのような操作感

## 🔧 実装計画

### Phase 1: ボタン表示ロジックの整理（0.25日）

#### ファイル: `src/App.tsx`

**変更箇所**:

```tsx
// 試合入力画面かどうかを判定
const isGameInputMode = !showGameList && !showTeamManagement && !showTeamStats;

// AppBar内のボタン表示（共有モード以外 かつ 試合入力画面のみ）
{
  !isSharedMode && isGameInputMode && (
    <>
      {/* 日付ボタン（sm以上で表示） */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Button
          color="inherit"
          onClick={handleOpenDateDialog}
          sx={{ mr: 1 }}
          aria-label="試合日を変更"
        >
          {new Date(game.date).toLocaleDateString('ja-JP')}
        </Button>
      </Box>

      {/* 保存ボタン */}
      <Button
        color="inherit"
        startIcon={!isMobile && <SaveIcon />}
        onClick={handleOpenSaveDialog}
        sx={{ mr: isMobile ? 0.5 : 1 }}
        aria-label="試合データを保存"
      >
        保存
      </Button>

      {/* 一覧表示ボタン（編集/一覧のトグル） */}
      <Button
        color="inherit"
        onClick={toggleViewMode}
        sx={{ mr: isMobile ? 0.5 : 1 }}
        aria-label={activeStep === 0 ? '一覧表示に切り替え' : '編集モードに戻る'}
      >
        {activeStep === 0 ? (isMobile ? '一覧' : '一覧表示') : (isMobile ? '編集' : '編集に戻る')}
      </Button>
    </>
  );
}

// 共有モード（閲覧専用）では、テーマ/ヘルプ/ホーム戻るのみ
{
  isSharedMode && (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {/* テーマ切替とヘルプは常設（現状の挙動を維持） */}
      <Button color="inherit" onClick={() => (window.location.href = window.location.origin)}>
        アプリに戻る
      </Button>
    </Box>
  );
}
```

### Phase 2: 動的タイトルの実装（0.1日）

```tsx
const getPageTitle = () => {
  if (isSharedMode) return '野球スコア（閲覧専用）';
  if (showGameList) return '試合一覧';
  if (showTeamManagement) return '選手管理';
  if (showTeamStats) return '通算成績';
  return '野球スコア';
};

// AppBar内
<Typography variant="h6" component="h1" sx={{ flexGrow: 0, mr: 2 }}>
  <SportsBaseballIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 28 }} />
  {getPageTitle()}
</Typography>;
```

### Phase 3: 戻るボタンの実装（0.15日）

```tsx
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ハンドラ
const handleBackToGame = () => {
  if (showGameList) setShowGameList(false);
  if (showTeamManagement) setShowTeamManagement(false);
  if (showTeamStats) setShowTeamStats(false);
  handleMenuClose();
};

// AppBar内（メニューボタンの位置に条件分岐で配置）
{
  isGameInputMode ? (
    <IconButton
      color="inherit"
      aria-label="メニューを開く"
      onClick={handleMenuOpen}
      edge="start"
      sx={{ mr: 2 }}
    >
      <MenuIcon />
    </IconButton>
  ) : (
    <IconButton
      color="inherit"
      aria-label="試合画面に戻る"
      onClick={handleBackToGame}
      edge="start"
      sx={{ mr: 2 }}
    >
      <ArrowBackIcon />
    </IconButton>
  );
}
```

## 🧪 テスト計画

### ユニットテスト（Jest）

```tsx
describe('AppBar context-aware display', () => {
  test('shows all buttons in game input mode', () => {
    // 日付、保存、一覧表示ボタンが表示されることを確認
  });

  test('hides game-related buttons in game list mode', () => {
    // showGameList=trueの時、日付、保存、一覧表示ボタンが非表示
  });

  test('shows back button in non-game modes', () => {
    // 試合一覧、選手管理、通算成績で戻るボタンが表示
  });

  test('displays correct page title for each mode', () => {
    // 各画面モードで正しいタイトルが表示されることを確認
  });
  
  test('shared mode shows only theme/help/home actions', () => {
    // isSharedMode=true の時にゲーム関連ボタンが出ないことを確認
  });
});
```

### 手動テスト（操作フロー）

1. **試合入力画面**:
   - ✅ 日付、保存、一覧表示ボタンが表示される
   - ✅ メニューボタンが表示される

2. **試合一覧画面**:
   - ✅ 日付、保存、一覧表示ボタンが非表示
   - ✅ 戻るボタンが表示される
   - ✅ タイトルが「試合一覧」になる

3. **選手管理画面**:
   - ✅ 日付、保存、一覧表示ボタンが非表示
   - ✅ 戻るボタンが表示される
   - ✅ タイトルが「選手管理」になる

4. **通算成績画面**:
   - ✅ 日付、保存、一覧表示ボタンが非表示
   - ✅ 戻るボタンが表示される
   - ✅ タイトルが「通算成績」になる

5. **共有モード**:
   - ✅ 日付、保存ボタンが非表示
   - ✅ 一覧表示ボタンのみ表示
   - ✅ メニューボタンが非表示

### アクセシビリティテスト

```tsx
describe('AppBar accessibility', () => {
  test('back button has proper aria-label', () => {
    // 戻るボタンにaria-label="試合画面に戻る"があることを確認
  });

  test('dynamic title is announced by screen readers', () => {
    // 画面遷移時にタイトル変更が読み上げられることを確認
  });

  test('keyboard navigation works correctly', () => {
    // Tabキーで戻るボタンにフォーカスできることを確認
  });
});
```

## 📊 期待される効果

### UX改善

| 指標                   | Before             | After                  | 改善率 |
| ---------------------- | ------------------ | ---------------------- | ------ |
| 画面の識別性           | 低（タイトル固定） | 高（動的タイトル）     | +100%  |
| ボタンの関連性         | 低（常に表示）     | 高（コンテキスト連動） | +80%   |
| ナビゲーションの直感性 | 中（メニューのみ） | 高（戻るボタン追加）   | +60%   |

### コード品質

- **可読性**: `isGameInputMode`などの意味のある変数で条件が明確
- **保守性**: 画面モード判定ロジックが一箇所に集約
- **拡張性**: 新しい画面モード追加が容易

## 🎯 受け入れ条件

- [ ] 試合入力画面では、日付、保存、一覧表示ボタンが表示される
- [ ] 試合一覧、選手管理、通算成績画面では、これらのボタンが非表示になる
- [ ] 上記の画面では「戻る」ボタンが表示され、クリックで試合入力画面に戻る
- [ ] 各画面でタイトルが適切に表示される
- [ ] 共有モードでは一覧表示ボタンのみ表示される
- [ ] 全ての既存テストがパスする
- [ ] 新規アクセシビリティテストがパスする
- [ ] キーボード操作が正常に動作する
- [ ] スクリーンリーダーで適切に読み上げられる

## 🚀 実装スケジュール

| Phase    | 内容                     | 工数      | 担当 |
| -------- | ------------------------ | --------- | ---- |
| Phase 1  | ボタン表示ロジックの整理 | 0.25日    | -    |
| Phase 2  | 動的タイトルの実装       | 0.1日     | -    |
| Phase 3  | 戻るボタンの実装         | 0.15日    | -    |
| **合計** |                          | **0.5日** |      |

## 🔄 ロールバック計画

### 問題が発生した場合

1. **Phase 3のみロールバック**: 戻るボタンを削除
2. **Phase 2のみロールバック**: タイトルを固定に戻す
3. **Phase 1のみロールバック**: ボタンを常に表示に戻す
4. **完全ロールバック**: 全ての変更を元に戻す

### ロールバック手順

```bash
# Phase 1-3全体をロールバック
git revert <commit-hash>
```

## 📝 補足事項

### デザインガイドライン

#### 戻るボタン

- **アイコン**: `ArrowBackIcon`（Material-UI標準）
- **配置**: メニューボタンと同じ位置（左端）
- **色**: `color="inherit"`（AppBarの色に合わせる）
- **サイズ**: メニューボタンと同じ（44x44px minimum）

#### タイトル

- **フォント**: `variant="h6"`（既存と同じ）
- **位置**: 左側（アイコンの隣）
- **モバイル**: 必要に応じて省略（「野球スコア」→「スコア」）

### モバイル対応

```tsx
// モバイルではタイトルを短縮
const getPageTitle = () => {
  const fullTitle = (() => {
    if (isSharedMode) return '野球スコア（閲覧専用）';
    if (showGameList) return '試合一覧';
    if (showTeamManagement) return '選手管理';
    if (showTeamStats) return '通算成績';
    return '野球スコア';
  })();

  return isMobile ? fullTitle.replace('野球スコア', 'スコア') : fullTitle;
};
```

### パフォーマンス考慮

- 条件分岐は軽量（状態変数のチェックのみ）
- レンダリングへの影響は最小限
- `useMemo`は不要（計算コストが低い）

## 🔗 関連ドキュメント

- [UI改善プラン v2.0](./ui_improve_plan_v2.md) - Phase 1-4の基本改善
- [Material-UI AppBar](https://mui.com/material-ui/react-app-bar/) - AppBarコンポーネントのドキュメント
- [Material-UI Icons](https://mui.com/material-ui/material-icons/) - アイコンライブラリ

---

## 🚀 Phase 2: テスト品質強化（1.0日）

### PR-02: 優先度高コンポーネントのテスト拡充

**目的**: テストカバレッジを4-5%→60%に向上（現実的な目標設定）

**変更ファイル**:

- 新規: `src/components/__tests__/AtBatHistory.test.tsx`
- 新規: `src/components/__tests__/TeamManager.test.tsx`
- 新規: `src/components/__tests__/Login.test.tsx`
- 新規: `src/components/__tests__/LoadingButton.test.tsx`
- 新規: `src/components/__tests__/AtBatHistory.a11y.test.tsx`
- 新規: `src/components/__tests__/TeamManager.a11y.test.tsx`
- 新規: `scripts/check-coverage.js`（CIでカバレッジ下限を判定）

**実装内容**（優先度順）:

#### 1. LoadingButton単体テスト（優先度: 高）

```tsx
describe('LoadingButton', () => {
  test('shows loading spinner when loading prop is true', () => {
    // ローディング中にCircularProgressが表示されることを確認
  });

  test('disables button when loading', () => {
    // ローディング中はボタンが無効化されることを確認
  });

  test('sets aria-busy attribute', () => {
    // aria-busy属性が適切に設定されることを確認
  });
});
```

#### 2. AtBatHistory単体テスト（優先度: 高）

\`\`\`tsx
describe('AtBatHistory', () => {
test('displays at-bat records correctly', () => {
// 打席記録が正しく表示されることを確認
});

test('handles edit action', () => {
// 編集ボタンクリックでonEditが呼ばれることを確認
});

test('handles delete action', () => {
// 削除ボタンクリックでonDeleteが呼ばれることを確認
});
});
\`\`\`

#### 2. TeamManager統合テスト

\`\`\`tsx
describe('TeamManager', () => {
test('creates new team', async () => {
// チーム作成フローをテスト
});

test('adds player to team', async () => {
// 選手追加フローをテスト
});

test('validates player input', () => {
// バリデーションエラーの表示確認
});
});
\`\`\`

#### 3. LoadingButton単体テスト

\`\`\`tsx
describe('LoadingButton', () => {
test('shows loading spinner when loading prop is true', () => {
// ローディング中にCircularProgressが表示されることを確認
});

test('disables button when loading', () => {
// ローディング中はボタンが無効化されることを確認
});

test('sets aria-busy attribute', () => {
// aria-busy属性が適切に設定されることを確認
});
});
\`\`\`

**受け入れ条件**:

- [ ] テストカバレッジが30%以上（初期段階の現実的な下限）
- [ ] 優先度高コンポーネント（LoadingButton, AtBatHistory, TeamManager）にテスト追加
- [ ] 新規a11yテストが2件以上追加（8/15コンポーネント以上に）
- [ ] 全テストがパス

**工数**: 1.0日

---

## 🔒 Phase 3: CI/CD品質ゲート実装（1.0日）

### PR-03: Deployment Readinessの実質的チェック実装

**目的**: CI/CDパイプラインに実質的な品質ゲートを実装

**変更ファイル**:

- 変更: `.github/workflows/ci.yml`
- 新規: `scripts/check-bundle-size.js`
- 新規: `scripts/check-coverage.js`
- 新規: `.github/workflows/quality-gate.yml`

**実装内容**:

#### 1. カバレッジ閾値チェック（Nodeスクリプト方式・閾値は環境変数で可変）

```javascript
// scripts/check-coverage.js
const fs = require('fs');

const SUMMARY_PATH = 'coverage/coverage-summary.json';
const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 30); // 初期下限は30%

if (!fs.existsSync(SUMMARY_PATH)) {
  console.error(`❌ Coverage summary not found: ${SUMMARY_PATH}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
const linesPct = Number(summary.total?.lines?.pct || 0);

console.log(`Coverage(lines): ${linesPct}% (threshold: ${THRESHOLD}%)`);
if (isNaN(linesPct) || linesPct < THRESHOLD) {
  console.error(`❌ Coverage ${linesPct}% is below threshold ${THRESHOLD}%`);
  console.error('詳細レポート:', JSON.stringify(summary.total, null, 2));
  process.exit(1);
}
console.log('✅ Coverage meets threshold');
```

#### 2. バンドルサイズ監視

\`\`\`javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const MAX_BUNDLE_SIZE = 1024 \* 1024; // 1MB（現実的なサイズ制限）
const buildDir = path.join(\_\_dirname, '../build/static/js');

const files = fs.readdirSync(buildDir)
.filter(file => file.endsWith('.js') && !file.includes('.map'));

const mainBundle = files.find(file => file.startsWith('main.'));
const size = fs.statSync(path.join(buildDir, mainBundle)).size;

console.log(\`Main bundle size: \${(size / 1024).toFixed(2)}KB\`);

if (size > MAX_BUNDLE_SIZE) {
console.error(\`❌ Bundle size \${(size / 1024).toFixed(2)}KB exceeds limit \${(MAX_BUNDLE_SIZE / 1024).toFixed(2)}KB\`);
process.exit(1);
}

console.log('✅ Bundle size within limit');
\`\`\`

#### 3. 品質ゲートの統合（YAML整形と可変閾値対応）

```yaml
deployment-check:
  name: Deployment Readiness
  runs-on: ubuntu-latest
  needs: [test, build, security-audit]
  if: github.ref == 'refs/heads/main'

  steps:
    - name: Checkout code
      uses: actions/checkout@v5

    - name: Setup Node.js
      uses: actions/setup-node@v5
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: build-files
        path: build/

    - name: Download coverage artifacts
      uses: actions/download-artifact@v4
      with:
        name: coverage-report
        path: coverage/

    - name: Check test coverage threshold
      run: node scripts/check-coverage.js
      env:
        COVERAGE_THRESHOLD: 30

    - name: Check bundle size
      run: node scripts/check-bundle-size.js

    - name: Verify TypeScript compilation
      run: npx tsc --noEmit

    - name: Check for security vulnerabilities
      run: npm audit --audit-level=high --production

    - name: Quality gate summary
      run: |
        echo "📊 Quality Gate Report"
        echo "====================="
        echo "✅ Test Coverage: Meets threshold"
        echo "✅ Bundle Size: Within limit"
        echo "✅ TypeScript: No errors"
        echo "✅ Security: No high/critical vulnerabilities"
        echo "🚀 Deployment approved!"
```

#### 4. CodeQL セキュリティスキャン追加

\`\`\`yaml

# .github/workflows/quality-gate.yml (新規)

name: Security & Quality Gate

on:
pull_request:
branches: [main]
push:
branches: [main]
schedule: - cron: '0 0 \* \* 1' # 毎週月曜日

jobs:
codeql-analysis:
name: CodeQL Analysis
runs-on: ubuntu-latest
permissions:
security-events: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

\`\`\`

**受け入れ条件**:

- [ ] カバレッジ30%未満でCI失敗（初期下限・環境変数で可変）
- [ ] バンドルサイズ1MB超過でCI失敗（現実的な制限）
- [ ] TypeScriptエラーでCI失敗
- [ ] 高/クリティカルな脆弱性でCI失敗
- [ ] CodeQLスキャンが週次で実行
- [ ] mainブランチへのpush時に全チェック実行

**工数**: 1.0日

---

## 📈 Phase 4: 監視とエラートラッキング（0.5日）

### PR-04: 基本的な監視基盤の準備

**目的**: エラー監視とパフォーマンストラッキングの準備

**変更ファイル**:

- 変更: `src/index.tsx` (エラーバウンダリ追加)
- 新規: `src/components/ErrorBoundary.tsx`
- 変更: `src/reportWebVitals.ts` (Web Vitals送信)
- 変更: `package.json` (web-vitals設定)

**実装内容**:

#### 1. ErrorBoundary実装

\`\`\`tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
children: ReactNode;
}

interface State {
hasError: boolean;
error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
constructor(props: Props) {
super(props);
this.state = { hasError: false, error: null };
}

static getDerivedStateFromError(error: Error): State {
return { hasError: true, error };
}

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
console.error('Error caught by boundary:', error, errorInfo);

    // TODO: エラー監視サービスに送信（Sentry等）
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }

}

handleReset = () => {
this.setState({ hasError: false, error: null });
window.location.href = '/';
};

render() {
if (this.state.hasError) {
return (
<Box
sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
          }} >
<Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
<ErrorOutlineIcon
sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
/>
<Typography variant="h5" gutterBottom>
エラーが発生しました
</Typography>
<Typography color="text.secondary" sx={{ mb: 3 }}>
申し訳ございません。予期しないエラーが発生しました。
</Typography>
{process.env.NODE_ENV === 'development' && (
<Paper
sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'grey.100',
                  textAlign: 'left',
                  overflow: 'auto',
                }} >
<Typography variant="caption" component="pre">
{this.state.error?.toString()}
</Typography>
</Paper>
)}
<Button variant="contained" onClick={this.handleReset}>
ホームに戻る
</Button>
</Paper>
</Box>
);
}

    return this.props.children;

}
}

export default ErrorBoundary;
\`\`\`

#### 2. Web Vitals送信の強化

\`\`\`typescript
// src/reportWebVitals.ts
import { ReportHandler, Metric } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
if (onPerfEntry && onPerfEntry instanceof Function) {
import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
const reportMetric = (metric: Metric) => {
onPerfEntry(metric);

        // TODO: アナリティクスサービスに送信
        // if (process.env.NODE_ENV === 'production') {
        //   // Google Analytics 4
        //   gtag('event', metric.name, {
        //     value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        //     metric_id: metric.id,
        //     metric_value: metric.value,
        //     metric_delta: metric.delta,
        //   });
        // }

        console.log(\`[Web Vitals] \${metric.name}:\`, {
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
        });
      };

      onCLS(reportMetric);
      onINP(reportMetric);
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
    });

}
};

export default reportWebVitals;
\`\`\`

#### 3. index.tsxへの適用

\`\`\`tsx
// src/index.tsx
import ErrorBoundary from './components/ErrorBoundary';

root.render(
<React.StrictMode>
<ErrorBoundary>
<App />
</ErrorBoundary>
</React.StrictMode>
);

reportWebVitals((metric) => {
console.log(metric);
});
\`\`\`

**受け入れ条件**:

- [ ] ErrorBoundaryが実装され、エラー時にUI表示
- [ ] 開発環境でエラー詳細が表示される
- [ ] Web VitalsがconsoleにログOutput
- [ ] 本番環境では適切なエラーメッセージのみ表示

**工数**: 0.5日

**Note**: Sentry等の外部サービス統合は、本PRでは準備のみ（コメントアウト）とし、実際の統合は別途判断

---

## 📊 工数とスケジュール（v3.0全体）

### 総工数見積もり

| Phase    | PR    | 内容                         | 工数      |
| -------- | ----- | ---------------------------- | --------- |
| Phase 1  | PR-01 | コンテキストアウェアなAppBar | 0.5日     |
| Phase 2  | PR-02 | テスト品質強化               | 1.0日     |
| Phase 3  | PR-03 | CI/CD品質ゲート実装          | 1.0日     |
| Phase 4  | PR-04 | 監視基盤準備                 | 0.5日     |
| **合計** |       |                              | **3.0日** |

### 推奨スケジュール

```
Day 1: PR-01完成（UX改善）
Day 2: PR-02着手・完成（テスト拡充）
Day 3: PR-03着手・完成（CI/CD強化）
Day 4: PR-04着手・完成（監視準備）
```

---

## 🎯 v3.0受け入れ条件（全体）

### Phase 1（UX）

- [ ] 各画面で適切なボタンのみ表示
- [ ] 動的タイトルが実装
- [ ] 戻るボタンが機能
- [ ] アクセシビリティテスト合格

### Phase 2（テスト）

- [ ] テストカバレッジ30%以上（CIゲート）／目標60%
- [ ] a11yテスト10/15コンポーネント以上
- [ ] 優先度高コンポーネントに単体テスト

### Phase 3（CI/CD）

- [ ] カバレッジ閾値チェックが動作
- [ ] バンドルサイズ監視が動作
- [ ] CodeQLスキャンが週次実行
- [ ] deployment-checkが実質的なチェック実施

### Phase 4（監視）

- [ ] ErrorBoundaryが実装
- [ ] Web Vitals計測が動作
- [ ] エラー時に適切なUIが表示

---

## 🔗 関連ドキュメント

- [UI改善プラン v2.0](./ui_improve_plan_v2.md) - 基本改善（完了）
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [GitHub Actions Quality Gates](https://docs.github.com/en/actions)
- [Web Vitals](https://web.dev/vitals/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

## 📅 変更履歴

| バージョン | 日付       | 変更内容                                              | 作成者       |
| ---------- | ---------- | ----------------------------------------------------- | ------------ |
| 3.0        | 2025-10-06 | 初版作成：コンテキストアウェアなAppBar + 品質基盤強化 | AI Assistant |
| 3.0.1      | 2025-10-06 | v2.0統合レビュー結果を追加、Phase 2-4を拡充           | AI Assistant |
| 3.1        | 2025-10-06 | カバレッジ実測値反映（4-5%）、目標60%に調整           | AI Assistant |
| 3.1.1      | 2025-10-06 | バンドルサイズ制限を1MBに調整、現実的なテスト戦略追加 | AI Assistant |
