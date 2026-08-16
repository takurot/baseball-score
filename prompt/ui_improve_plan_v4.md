# UI改善プラン v4.0：中長期的構造改善の詳細実装計画

## 📋 概要

**作成日**: 2025-10-07  
**バージョン**: 4.0  
**ステータス**: 提案中  
**優先度**: Medium-High  
**工数見積**: 8週間（1人）/ 4週間（2人）  
**前提条件**: v3.0 Phase 1-4の完了

### v3.0からの位置づけ

v3.0 Phase 1-4完了により、以下が達成されます：
- ✅ コンテキストアウェアなUI（0.5日）
- ✅ テストカバレッジ30-60%（1.0日）
- ✅ CI/CD品質ゲート実装（1.0日）
- ✅ 基本的な監視基盤（0.5日）

**v4.0の目的**：
さらなる品質向上とメンテナンス性向上のため、アーキテクチャレベルの構造改善を実施します。

## 🎯 目的と目標

### 主目的

1. **アーキテクチャ改善**: 巨大コンポーネントの分割とビジネスロジックの分離
2. **テスタビリティ向上**: 外部依存の抽象化によるテスト容易性の向上
3. **品質保証強化**: E2Eテストによるクリティカルパスの自動検証

### 定量的目標

| 指標 | v3.0完了時 | v4.0完了時 | 改善率 |
|------|-----------|-----------|--------|
| テストカバレッジ | 30-60% | 70%+ | +17-133% |
| App.tsxの行数 | 1,707行 | 500行以下 | -71% |
| 平均テスト実行時間 | 10-30秒 | 5秒以下 | -83% |
| バグ検出時間 | 数時間 | 数分 | -99% |
| 新機能開発速度 | 基準 | 1.5倍 | +50% |

## 📊 現状分析と課題

### カバレッジボトルネック分析

```
現状の構造的課題:
├─ App.tsx: 1,707行 (0%カバー)
│  ├─ ビジネスロジックとUIの密結合
│  ├─ 状態管理の複雑性
│  └─ テスト困難性
│
├─ Firebase系: 1,095行 (0%カバー)
│  ├─ 直接的な外部依存
│  ├─ モックの複雑性
│  └─ テスト実行速度の低下
│
└─ 大規模UIコンポーネント: 2,500行+
   ├─ 統合テスト不足
   ├─ エッジケースの未検証
   └─ リグレッション検出の困難性
```

### コードベース整合性メモ（重要）

実装計画のコード例と、現行コードの型/仕様差分を先に明示します。

- HitResult（打撃結果）: 現行は `src/types/index.ts` の `HitResult` 型を使用。シングルは `IH`/`LH`/`CH`/`RH`、二塁打は `2B`、三塁打は `3B`、三振は `SO`。計画書の `IIH`/`IIIH`/`K` はそれぞれ `2B`/`3B`/`SO` に読み替えます。
- RunEvent（得点イベント）: プロパティは `runCount` と `isTop` を使用（`runs` ではない）。
- 得点計算: スコアは「打席の打点 `AtBat.rbi`」と「得点イベント `RunEvent.runCount`」の合計。`ScoreBoard` は「先攻=表（`isTop: true`）、後攻=裏（`isTop: false`）」前提で計算しています。
- イニング数: 現行UIは最大7回表示を前提にしており（少年野球設定）、例はこの前提で記述します。
- Provider構成: `AuthProvider` は `App` 内でラップされています。DI（RepositoryProvider）導入時は `App` 内に追加するか、`index.tsx` 側に移設する方針を明記します。

### 技術的負債の定量化

| 負債項目 | 影響度 | 緊急度 | 対応Phase |
|---------|--------|--------|----------|
| App.tsxの肥大化 | 高 | 高 | Phase 5a |
| Firebase密結合 | 高 | 中 | Phase 5b |
| E2Eテスト不在 | 中 | 中 | Phase 5c |
| ビジネスロジック散在 | 高 | 高 | Phase 5a |
| カスタムHooks不足 | 中 | 中 | Phase 5a |

---

## 🏗️ Phase 5a: App.tsxのリファクタリング（3.0日）

### 目的

1,707行の巨大ファイルをテスト可能な単位に分割し、保守性とテスタビリティを向上させる。

### 🚨【重要】一時的なカバレッジ閾値の緩和

現在、CIの品質ゲートのカバレッジ閾値は**30%**に戻しています（Issue #192 で対応）。

### 実装戦略：段階的分離アプローチ

**原則**：
- ✅ 既存機能を壊さない（機能フリーズなし）
- ✅ 小さく分割して段階的にテスト
- ✅ 各ステップで品質検証を実施
- ✅ ロールバック可能な単位でコミット

---

### Step 5a-1: カスタムHooks抽出（1.5日）

#### 対象ロジックの特定

App.tsxから抽出すべきロジック（優先度順）：

| Hook名 | 責務 | 行数 | 優先度 | 工数 |
|--------|------|------|--------|------|
| useGameState | 試合状態管理 | ~300 | 最高 | 0.5日 |
| useScoreCalculation | スコア計算 | ~200 | 高 | 0.3日 |
| useTeamManagement | チーム管理 | ~250 | 高 | 0.3日 |
| useInningControl | イニング制御 | ~150 | 中 | 0.2日 |
| useAtBatHistory | 打席履歴管理 | ~100 | 中 | 0.2日 |

#### 実装1-1: useGameState（0.5日）

**作成ファイル**: `src/hooks/useGameState.ts`

```typescript
import { useState, useCallback } from 'react';
import { Game, Team, AtBat, RunEvent } from '../types';

export interface GameState {
  homeTeam: Team;
  awayTeam: Team;
  currentInning: number;
  isTop: boolean;
  outs: number;
  runners: { first: boolean; second: boolean; third: boolean };
}

export interface GameStateActions {
  setHomeTeam: (team: Team) => void;
  setAwayTeam: (team: Team) => void;
  addAtBat: (atBat: AtBat) => void;
  updateInning: (inning: number, isTop: boolean) => void;
  resetGame: () => void;
  loadGame: (game: Game) => void;
}

export interface UseGameStateReturn {
  state: GameState;
  actions: GameStateActions;
}

/**
 * 試合状態を管理するカスタムHook
 * 
 * @param initialGame - 初期化用の試合データ（オプション）
 * @returns 試合状態と操作関数
 * 
 * @example
 * ```tsx
 * const { state, actions } = useGameState();
 * actions.addAtBat({ playerId: '1', result: 'IH' });
 * ```
 */
export const useGameState = (initialGame?: Game): UseGameStateReturn => {
  const [homeTeam, setHomeTeam] = useState<Team>(() => 
    initialGame?.homeTeam || createEmptyTeam()
  );
  
  const [awayTeam, setAwayTeam] = useState<Team>(() => 
    initialGame?.awayTeam || createEmptyTeam()
  );
  
  const [currentInning, setCurrentInning] = useState(
    initialGame?.currentInning || 1
  );
  
  const [isTop, setIsTop] = useState(
    initialGame?.isTop ?? true
  );
  
  const [outs, setOuts] = useState(0);
  
  const [runners, setRunners] = useState({
    first: false,
    second: false,
    third: false,
  });

  /**
   * 打席結果を追加
   */
  const addAtBat = useCallback((atBat: AtBat) => {
    const currentTeam = isTop ? awayTeam : homeTeam;
    const setCurrentTeam = isTop ? setAwayTeam : setHomeTeam;

    // 打席記録を追加
    const updatedAtBats = [...currentTeam.atBats, atBat];
    
    setCurrentTeam({
      ...currentTeam,
      atBats: updatedAtBats,
    });

    // アウトカウント、ランナー状態の更新ロジック
    // （既存のApp.tsxから移行）
  }, [homeTeam, awayTeam, isTop, outs, runners]);

  /**
   * イニングを更新
   */
  const updateInning = useCallback((inning: number, top: boolean) => {
    setCurrentInning(inning);
    setIsTop(top);
    setOuts(0);
    setRunners({ first: false, second: false, third: false });
  }, []);

  /**
   * 試合をリセット
   */
  const resetGame = useCallback(() => {
    setHomeTeam(createEmptyTeam());
    setAwayTeam(createEmptyTeam());
    setCurrentInning(1);
    setIsTop(true);
    setOuts(0);
    setRunners({ first: false, second: false, third: false });
  }, []);

  /**
   * 保存済み試合を読み込み
   */
  const loadGame = useCallback((game: Game) => {
    setHomeTeam(game.homeTeam);
    setAwayTeam(game.awayTeam);
    setCurrentInning(game.currentInning);
    setIsTop(game.isTop);
    // その他の状態も復元
  }, []);

  return {
    state: {
      homeTeam,
      awayTeam,
      currentInning,
      isTop,
      outs,
      runners,
    },
    actions: {
      setHomeTeam,
      setAwayTeam,
      addAtBat,
      updateInning,
      resetGame,
      loadGame,
    },
  };
};

// ヘルパー関数
const createEmptyTeam = (): Team => ({
  name: '',
  players: [],
  atBats: [],
  // ... その他の初期値
});
```

**テストファイル**: `src/hooks/__tests__/useGameState.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { AtBat } from '../../types';

describe('useGameState', () => {
  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.state.currentInning).toBe(1);
    expect(result.current.state.isTop).toBe(true);
    expect(result.current.state.outs).toBe(0);
  });

  test('打席を追加できる', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.setAwayTeam({
        name: 'テストチーム',
        players: [{ id: 'p1', name: '選手1', number: 1 }],
        atBats: [],
      });
    });

    const atBat: AtBat = {
      playerId: 'p1',
      result: 'IH',
      inning: 1,
      isTop: true,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.actions.addAtBat(atBat);
    });

    expect(result.current.state.awayTeam.atBats).toHaveLength(1);
    expect(result.current.state.awayTeam.atBats[0]).toEqual(atBat);
  });

  test('イニングを更新できる', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.updateInning(2, false);
    });

    expect(result.current.state.currentInning).toBe(2);
    expect(result.current.state.isTop).toBe(false);
    expect(result.current.state.outs).toBe(0);
  });

  test('試合をリセットできる', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.updateInning(5, false);
      result.current.actions.resetGame();
    });

    expect(result.current.state.currentInning).toBe(1);
    expect(result.current.state.isTop).toBe(true);
  });

  test('保存済み試合を読み込める', () => {
    const { result } = renderHook(() => useGameState());

    const savedGame = {
      homeTeam: { name: 'ホーム', players: [], atBats: [] },
      awayTeam: { name: 'アウェイ', players: [], atBats: [] },
      currentInning: 3,
      isTop: false,
    };

    act(() => {
      result.current.actions.loadGame(savedGame);
    });

    expect(result.current.state.homeTeam.name).toBe('ホーム');
    expect(result.current.state.currentInning).toBe(3);
    expect(result.current.state.isTop).toBe(false);
  });
});
```

**App.tsxでの使用方法**:

```typescript
// Before
const [homeTeam, setHomeTeam] = useState<Team>(/* ... */);
const [awayTeam, setAwayTeam] = useState<Team>(/* ... */);
const [currentInning, setCurrentInning] = useState(1);
// ... 大量の状態管理コード

// After
import { useGameState } from './hooks/useGameState';

const { state, actions } = useGameState(initialGame);
const { homeTeam, awayTeam, currentInning, isTop } = state;
```

**期待効果**:
- ✅ App.tsxから300行削減
- ✅ 状態管理ロジックのテストカバレッジ90%+
- ✅ 再利用可能なHook（他のコンポーネントでも使用可能）

---

#### 実装1-2: useScoreCalculation（0.3日）

**作成ファイル**: `src/hooks/useScoreCalculation.ts`

```typescript
import { useMemo } from 'react';
import { Team, RunEvent } from '../types';

export interface ScoreData {
  totalScore: number;
  inningScores: number[];
  hits: number;
  errors: number;
}

export interface UseScoreCalculationReturn {
  homeScore: ScoreData;
  awayScore: ScoreData;
  calculateInningScore: (team: Team, inning: number) => number;
}

/**
 * スコア計算を行うカスタムHook
 *
 * - RunEvent は runCount を用いる
 * - 先攻(away)は表(isTop: true)、後攻(home)は裏(isTop: false)
 */
export const useScoreCalculation = (
  homeTeam: Team,
  awayTeam: Team,
  runEvents: RunEvent[]
): UseScoreCalculationReturn => {
  // 合計スコア = AtBat.rbi 合計 + RunEvent.runCount 合計
  const calculateTotalScore = (team: Team, isAwayTeam: boolean): number => {
    const atBatTotal = team.atBats.reduce((sum, ab) => sum + (ab.rbi || 0), 0);
    const runEventTotal = runEvents
      .filter((e) => e.isTop === isAwayTeam)
      .reduce((sum, e) => sum + (e.runCount || 0), 0);
    return atBatTotal + runEventTotal;
  };

  const calculateInningScores = (
    team: Team,
    isAwayTeam: boolean,
    maxInning: number
  ): number[] => {
    const scores: number[] = [];
    for (let i = 1; i <= maxInning; i++) {
      const atBatInning = team.atBats
        .filter((ab) => ab.inning === i)
        .reduce((sum, ab) => sum + (ab.rbi || 0), 0);
      const runEventInning = runEvents
        .filter((e) => e.inning === i && e.isTop === isAwayTeam)
        .reduce((sum, e) => sum + (e.runCount || 0), 0);
      scores.push(atBatInning + runEventInning);
    }
    return scores;
  };

  const calculateHits = (team: Team): number => {
    // ヒットは IH/LH/CH/RH/2B/3B/HR をカウント
    const hitResults = ['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR'];
    return team.atBats.filter((ab) => hitResults.includes(ab.result)).length;
  };

  const calculateErrors = (team: Team): number => {
    return team.atBats.filter((ab) => ab.result === 'E').length;
  };

  const maxInning = Math.max(...runEvents.map((e) => e.inning), 7);

  const homeScore = useMemo<ScoreData>(() => ({
    totalScore: calculateTotalScore(homeTeam, false),
    inningScores: calculateInningScores(homeTeam, false, maxInning),
    hits: calculateHits(homeTeam),
    errors: calculateErrors(homeTeam),
  }), [homeTeam, runEvents, maxInning]);

  const awayScore = useMemo<ScoreData>(() => ({
    totalScore: calculateTotalScore(awayTeam, true),
    inningScores: calculateInningScores(awayTeam, true, maxInning),
    hits: calculateHits(awayTeam),
    errors: calculateErrors(awayTeam),
  }), [awayTeam, runEvents, maxInning]);

  const calculateInningScore = (team: Team, inning: number): number => {
    const isAwayTeam = team === awayTeam;
    const atBatInning = team.atBats
      .filter((ab) => ab.inning === inning)
      .reduce((sum, ab) => sum + (ab.rbi || 0), 0);
    const runEventInning = runEvents
      .filter((e) => e.inning === inning && e.isTop === isAwayTeam)
      .reduce((sum, e) => sum + (e.runCount || 0), 0);
    return atBatInning + runEventInning;
  };

  return { homeScore, awayScore, calculateInningScore };
};
```

**テストファイル**: `src/hooks/__tests__/useScoreCalculation.test.ts`

```typescript
import { renderHook } from '@testing-library/react';
import { useScoreCalculation } from '../useScoreCalculation';
import { Team, RunEvent } from '../../types';

describe('useScoreCalculation', () => {
  const mockHomeTeam: Team = {
    id: 'home',
    name: 'ホークス',
    players: [],
    atBats: [
      { id: 'ab1', playerId: '1', result: 'IH', inning: 1, rbi: 1, isOut: false },
      { id: 'ab2', playerId: '2', result: 'HR', inning: 2, rbi: 1, isOut: false },
      { id: 'ab3', playerId: '3', result: 'SO', inning: 3, rbi: 0, isOut: true },
    ],
  };

  const mockAwayTeam: Team = {
    id: 'away',
    name: 'タイガース',
    players: [],
    atBats: [
      { id: 'ab4', playerId: '1', result: '2B', inning: 1, rbi: 0, isOut: false },
      { id: 'ab5', playerId: '2', result: 'E', inning: 2, rbi: 0, isOut: false },
    ],
  };

  const mockRunEvents: RunEvent[] = [
    { id: 're1', inning: 1, isTop: false, runType: 'その他', runCount: 0, timestamp: Date.now() },
    { id: 're2', inning: 2, isTop: false, runType: 'その他', runCount: 3, timestamp: Date.now() },
    { id: 're3', inning: 1, isTop: true,  runType: 'その他', runCount: 2, timestamp: Date.now() },
  ];

  test('合計スコアを正しく計算する', () => {
    const { result } = renderHook(() =>
      useScoreCalculation(mockHomeTeam, mockAwayTeam, mockRunEvents)
    );

    expect(result.current.homeScore.totalScore).toBe(1 /* rbi */ + 3 /* run */);
    expect(result.current.awayScore.totalScore).toBe(2 /* run */);
  });

  test('イニング別スコアを正しく計算する', () => {
    const { result } = renderHook(() =>
      useScoreCalculation(mockHomeTeam, mockAwayTeam, mockRunEvents)
    );
    expect(result.current.homeScore.inningScores[0]).toBe(1);
    expect(result.current.homeScore.inningScores[1]).toBe(1 + 3);
    expect(result.current.awayScore.inningScores[0]).toBe(2);
  });

  test('ヒット数とエラー数を計算する', () => {
    const { result } = renderHook(() =>
      useScoreCalculation(mockHomeTeam, mockAwayTeam, mockRunEvents)
    );
    expect(result.current.homeScore.hits).toBe(2); // IH, HR
    expect(result.current.awayScore.hits).toBe(1); // 2B
    expect(result.current.awayScore.errors).toBe(1); // E
  });
});
```

**期待効果**:
- ✅ App.tsxから200行削減
- ✅ スコア計算ロジックのテストカバレッジ95%+
- ✅ useMemoによるパフォーマンス最適化

---

#### 実装1-3: その他のHooks（0.7日）

同様に以下のHooksを実装：

1. **useTeamManagement.ts** (0.3日)
   - チーム作成、編集、削除
   - 選手追加、削除、並び替え
   - バリデーション

2. **useInningControl.ts** (0.2日)
   - イニング進行ロジック
   - 攻守交代判定
   - 試合終了判定

3. **useAtBatHistory.ts** (0.2日)
   - 打席履歴の管理
   - 編集、削除機能
   - フィルタリング

---

### Step 5a-2: ビジネスロジックのサービス層分離（1.0日）

#### 対象ロジックの特定

| サービス名 | 責務 | 行数 | 工数 |
|-----------|------|------|------|
| ScoreCalculator | スコア計算（純粋関数） | ~150 | 0.3日 |
| InningManager | イニング進行制御 | ~100 | 0.2日 |
| AtBatValidator | 打席データ検証 | ~80 | 0.2日 |
| GameSerializer | 試合データシリアライズ | ~100 | 0.3日 |

#### 実装2-1: ScoreCalculator（0.3日）

**作成ファイル**: `src/services/ScoreCalculator.ts`

```typescript
import { RunEvent, AtBat } from '../types';

/**
 * スコア計算を行う純粋関数群
 */
export class ScoreCalculator {
  static calculateInningScore(
    runEvents: RunEvent[],
    inning: number,
    isTop: boolean
  ): number {
    return runEvents
      .filter((e) => e.inning === inning && e.isTop === isTop)
      .reduce((sum, e) => sum + (e.runCount || 0), 0);
  }

  static calculateTotalRunEvents(
    runEvents: RunEvent[],
    isTop: boolean
  ): number {
    return runEvents
      .filter((e) => e.isTop === isTop)
      .reduce((sum, e) => sum + (e.runCount || 0), 0);
  }

  static calculateHits(atBats: AtBat[]): number {
    const hitResults = ['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR'];
    return atBats.filter((ab) => hitResults.includes(ab.result)).length;
  }

  static calculateBattingAverage(atBats: AtBat[]): number {
    const validAtBats = atBats.filter(
      (ab) => !['BB', 'HBP', 'SAC', 'SF'].includes(ab.result)
    );
    if (validAtBats.length === 0) return 0;
    const hits = this.calculateHits(validAtBats);
    return hits / validAtBats.length;
  }

  static calculateSluggingPercentage(atBats: AtBat[]): number {
    const validAtBats = atBats.filter(
      (ab) => !['BB', 'HBP', 'SAC', 'SF'].includes(ab.result)
    );
    if (validAtBats.length === 0) return 0;
    const totalBases = validAtBats.reduce((sum, ab) => {
      switch (ab.result) {
        case 'IH':
        case 'LH':
        case 'CH':
        case 'RH':
          return sum + 1;
        case '2B':
          return sum + 2;
        case '3B':
          return sum + 3;
        case 'HR':
          return sum + 4;
        default:
          return sum;
      }
    }, 0);
    return totalBases / validAtBats.length;
  }

  static calculateOnBasePercentage(atBats: AtBat[]): number {
    if (atBats.length === 0) return 0;
    const timesOnBase = atBats.filter((ab) =>
      ['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR', 'BB', 'HBP'].includes(ab.result)
    ).length;
    return timesOnBase / atBats.length;
  }

  static calculateOPS(atBats: AtBat[]): number {
    const obp = this.calculateOnBasePercentage(atBats);
    const slg = this.calculateSluggingPercentage(atBats);
    return obp + slg;
  }

  static determineWinner(
    homeScore: number,
    awayScore: number
  ): 'home' | 'away' | 'tie' {
    if (homeScore > awayScore) return 'home';
    if (awayScore > homeScore) return 'away';
    return 'tie';
  }
}
```

**テストファイル**: `src/services/__tests__/ScoreCalculator.test.ts`

```typescript
import { ScoreCalculator } from '../ScoreCalculator';
import { AtBat, RunEvent } from '../../types';

describe('ScoreCalculator', () => {
  describe('calculateInningScore', () => {
    test('指定イニングのスコアを計算する', () => {
      const runEvents: RunEvent[] = [
        { id: '1', inning: 1, isTop: true,  runType: 'その他', runCount: 2, timestamp: Date.now() },
        { id: '2', inning: 1, isTop: false, runType: 'その他', runCount: 1, timestamp: Date.now() },
        { id: '3', inning: 2, isTop: true,  runType: 'その他', runCount: 3, timestamp: Date.now() },
      ];

      expect(ScoreCalculator.calculateInningScore(runEvents, 1, true)).toBe(2);
      expect(ScoreCalculator.calculateInningScore(runEvents, 1, false)).toBe(1);
      expect(ScoreCalculator.calculateInningScore(runEvents, 2, true)).toBe(3);
    });

    test('該当イニングがない場合は0を返す', () => {
      const runEvents: RunEvent[] = [];
      expect(ScoreCalculator.calculateInningScore(runEvents, 1, true)).toBe(0);
    });
  });

  describe('calculateBattingAverage', () => {
    test('打率を正しく計算する', () => {
      const atBats: AtBat[] = [
        { id: 'a1', playerId: 'p1', result: 'IH', inning: 1, rbi: 0, isOut: false },
        { id: 'a2', playerId: 'p2', result: 'SO', inning: 1, rbi: 0, isOut: true },
        { id: 'a3', playerId: 'p3', result: '2B', inning: 1, rbi: 0, isOut: false },
        { id: 'a4', playerId: 'p4', result: 'GO_SS', inning: 1, rbi: 0, isOut: true },
      ];
      expect(ScoreCalculator.calculateBattingAverage(atBats)).toBe(0.5);
    });

    test('四球は打数に含めない', () => {
      const atBats: AtBat[] = [
        { id: 'a1', playerId: 'p1', result: 'IH', inning: 1, rbi: 0, isOut: false },
        { id: 'a2', playerId: 'p2', result: 'BB', inning: 1, rbi: 0, isOut: false },
        { id: 'a3', playerId: 'p3', result: 'SO', inning: 1, rbi: 0, isOut: true },
      ];
      expect(ScoreCalculator.calculateBattingAverage(atBats)).toBe(0.5);
    });
  });

  describe('calculateOPS', () => {
    test('OPSを正しく計算する', () => {
      const atBats: AtBat[] = [
        { id: 'a1', playerId: 'p1', result: 'IH', inning: 1, rbi: 0, isOut: false },
        { id: 'a2', playerId: 'p2', result: 'HR', inning: 1, rbi: 0, isOut: false },
        { id: 'a3', playerId: 'p3', result: 'SO', inning: 1, rbi: 0, isOut: true },
        { id: 'a4', playerId: 'p4', result: 'BB', inning: 1, rbi: 0, isOut: false },
      ];
      const ops = ScoreCalculator.calculateOPS(atBats);
      expect(ops).toBeGreaterThan(0);
    });
  });

  describe('determineWinner', () => {
    test('ホームの勝利を正しく判定する', () => {
      expect(ScoreCalculator.determineWinner(5, 3)).toBe('home');
    });
    test('アウェイの勝利を正しく判定する', () => {
      expect(ScoreCalculator.determineWinner(2, 7)).toBe('away');
    });
    test('引き分けを正しく判定する', () => {
      expect(ScoreCalculator.determineWinner(4, 4)).toBe('tie');
    });
  });
});
```

**期待効果**:
- ✅ 純粋関数のためテストカバレッジ100%達成可能
- ✅ 再利用性が高い
- ✅ パフォーマンステストが容易

---

#### 実装2-2: その他のサービス（0.7日）

同様に以下のサービスを実装：

1. **InningManager.ts** (0.2日)
2. **AtBatValidator.ts** (0.2日)
3. **GameSerializer.ts** (0.3日)

---

### Step 5a-3: App.tsxの統合とリファクタリング（0.5日）

**変更ファイル**: `src/App.tsx`

```typescript
// Before: 1,707行の巨大ファイル

// After: Hooksとサービスを利用した簡潔な実装
import React from 'react';
import { useGameState } from './hooks/useGameState';
import { useScoreCalculation } from './hooks/useScoreCalculation';
import { useTeamManagement } from './hooks/useTeamManagement';
import { ScoreCalculator } from './services/ScoreCalculator';

const App: React.FC = () => {
  // 状態管理をHooksに委譲
  const { state, actions } = useGameState();
  const { homeScore, awayScore } = useScoreCalculation(
    state.homeTeam,
    state.awayTeam,
    state.runEvents
  );
  const teamManagement = useTeamManagement();

  // ビジネスロジックをサービス層に委譲
  const winner = ScoreCalculator.determineWinner(
    homeScore.totalScore,
    awayScore.totalScore
  );

  // UIレンダリングに集中
  return (
    <div>
      {/* ... UIコンポーネント */}
    </div>
  );
};

export default App;

// 目標: 500行以下
```

**App.tsxのテスト**: `src/App.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('正常にレンダリングされる', () => {
    render(<App />);
    expect(screen.getByText(/野球スコア/i)).toBeInTheDocument();
  });

  test('試合を作成できる', async () => {
    render(<App />);
    
    // 試合作成フロー
    fireEvent.click(screen.getByText('新しい試合'));
    // ... さらなるインタラクション
  });

  // Hooksとサービス層が既にテスト済みなので
  // Appのテストは統合テスト的な観点で最小限に
});
```

---

### Phase 5a受け入れ条件

- [ ] useGameStateが実装され、テストカバレッジ90%以上
- [ ] useScoreCalculationが実装され、テストカバレッジ95%以上
- [ ] ScoreCalculatorサービスが実装され、テストカバレッジ100%
- [ ] App.tsxが500行以下に削減
- [ ] 全ての既存機能が正常動作
- [ ] 全テストがパス
- [ ] テストカバレッジが50%以上に向上
- [x] **CIのカバレッジ閾値を30%に戻す**

**工数**: 3.0日

---

## 🔒 Phase 5b: Firebase依存の抽象化（2.0日）

### 目的

Firebase直接依存を抽象化し、テスト容易性とプラットフォーム非依存性を向上させる。

### 実装戦略：Repositoryパターンの導入

---

### Step 5b-1: Repositoryインターフェース定義（0.3日）

**作成ファイル**: `src/repositories/interfaces/IGameRepository.ts`

```typescript
import { Game } from '../../types';

/**
 * 試合データリポジトリのインターフェース
 * 
 * 実装:
 * - FirebaseGameRepository (本番環境)
 * - MockGameRepository (テスト環境)
 * - LocalStorageGameRepository (オフライン環境)
 */
export interface IGameRepository {
  /**
   * 試合を保存
   * 
   * @param game - 試合データ
   * @param userId - ユーザーID
   * @returns 保存された試合のID
   */
  save(game: Game, userId: string): Promise<string>;

  /**
   * 試合を取得
   * 
   * @param gameId - 試合ID
   * @returns 試合データ（存在しない場合はnull）
   */
  load(gameId: string): Promise<Game | null>;

  /**
   * ユーザーの試合一覧を取得
   * 
   * @param userId - ユーザーID
   * @param options - フィルタリングオプション
   * @returns 試合データの配列
   */
  list(userId: string, options?: ListOptions): Promise<Game[]>;

  /**
   * 試合を削除
   * 
   * @param gameId - 試合ID
   */
  delete(gameId: string): Promise<void>;

  /**
   * 試合を更新
   * 
   * @param gameId - 試合ID
   * @param game - 更新する試合データ
   */
  update(gameId: string, game: Partial<Game>): Promise<void>;
}

export interface ListOptions {
  limit?: number;
  orderBy?: 'date' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
  startAfter?: string; // ページネーション用
}
```

**その他のインターフェース**:

```typescript
// src/repositories/interfaces/ITeamRepository.ts
export interface ITeamRepository {
  save(team: Team, userId: string): Promise<string>;
  load(teamId: string): Promise<Team | null>;
  list(userId: string): Promise<Team[]>;
  delete(teamId: string): Promise<void>;
  update(teamId: string, team: Partial<Team>): Promise<void>;
}

// src/repositories/interfaces/IStatsRepository.ts
export interface IStatsRepository {
  savePlayerStats(playerId: string, stats: PlayerStats): Promise<void>;
  loadPlayerStats(playerId: string): Promise<PlayerStats | null>;
  loadTeamStats(teamId: string): Promise<TeamStats | null>;
}
```

---

### Step 5b-2: Firebase実装（0.5日）

**作成ファイル**: `src/repositories/implementations/FirebaseGameRepository.ts`

```typescript
import { Firestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { IGameRepository, ListOptions } from '../interfaces/IGameRepository';
import { Game } from '../../types';

export class FirebaseGameRepository implements IGameRepository {
  private firestore: Firestore;
  private collectionName = 'games';

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  async save(game: Game, userId: string): Promise<string> {
    const gamesRef = collection(this.firestore, this.collectionName);
    const newDocRef = doc(gamesRef);
    
    const gameData = {
      ...game,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(newDocRef, gameData);
    return newDocRef.id;
  }

  async load(gameId: string): Promise<Game | null> {
    const docRef = doc(this.firestore, this.collectionName, gameId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as Game;
  }

  async list(userId: string, options: ListOptions = {}): Promise<Game[]> {
    const {
      limit = 50,
      orderBy: orderField = 'createdAt',
      orderDirection = 'desc',
    } = options;

    const gamesRef = collection(this.firestore, this.collectionName);
    const q = query(
      gamesRef,
      where('userId', '==', userId),
      orderBy(orderField, orderDirection),
      fbLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Game));
  }

  async delete(gameId: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, gameId);
    await deleteDoc(docRef);
  }

  async update(gameId: string, game: Partial<Game>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, gameId);
    await setDoc(docRef, {
      ...game,
      updatedAt: Date.now(),
    }, { merge: true });
  }
}
```

---

### Step 5b-3: Mock実装（0.3日）

**作成ファイル**: `src/repositories/implementations/MockGameRepository.ts`

```typescript
import { IGameRepository, ListOptions } from '../interfaces/IGameRepository';
import { Game } from '../../types';

/**
 * テスト用のモックリポジトリ
 * 
 * 特徴:
 * - メモリ内でデータを管理
 * - Firebase Emulator不要
 * - テスト実行速度が速い（50倍以上）
 */
export class MockGameRepository implements IGameRepository {
  private storage: Map<string, Game> = new Map();
  private idCounter = 0;

  async save(game: Game, userId: string): Promise<string> {
    const id = `mock-game-${++this.idCounter}`;
    const gameData = {
      ...game,
      id,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.storage.set(id, gameData);
    
    // 非同期動作をシミュレート
    await this.delay(10);
    
    return id;
  }

  async load(gameId: string): Promise<Game | null> {
    await this.delay(10);
    return this.storage.get(gameId) || null;
  }

  async list(userId: string, options: ListOptions = {}): Promise<Game[]> {
    await this.delay(10);
    
    let games = Array.from(this.storage.values())
      .filter(game => game.userId === userId);

    // ソート
    const { orderBy = 'createdAt', orderDirection = 'desc' } = options;
    games.sort((a, b) => {
      const aVal = a[orderBy] || 0;
      const bVal = b[orderBy] || 0;
      return orderDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // リミット
    if (options.limit) {
      games = games.slice(0, options.limit);
    }

    return games;
  }

  async delete(gameId: string): Promise<void> {
    await this.delay(10);
    this.storage.delete(gameId);
  }

  async update(gameId: string, game: Partial<Game>): Promise<void> {
    await this.delay(10);
    const existing = this.storage.get(gameId);
    
    if (existing) {
      this.storage.set(gameId, {
        ...existing,
        ...game,
        updatedAt: Date.now(),
      });
    }
  }

  // テスト用ヘルパーメソッド
  clear(): void {
    this.storage.clear();
    this.idCounter = 0;
  }

  size(): number {
    return this.storage.size;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**テストファイル**: `src/repositories/__tests__/MockGameRepository.test.ts`

```typescript
import { MockGameRepository } from '../implementations/MockGameRepository';
import { Game } from '../../types';

describe('MockGameRepository', () => {
  let repository: MockGameRepository;

  beforeEach(() => {
    repository = new MockGameRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  test('試合を保存できる', async () => {
    const game: Game = {
      homeTeam: { name: 'ホークス', players: [], atBats: [] },
      awayTeam: { name: 'タイガース', players: [], atBats: [] },
      date: Date.now(),
    };

    const gameId = await repository.save(game, 'user123');

    expect(gameId).toMatch(/^mock-game-\d+$/);
    expect(repository.size()).toBe(1);
  });

  test('保存した試合を取得できる', async () => {
    const game: Game = {
      homeTeam: { name: 'ホークス', players: [], atBats: [] },
      awayTeam: { name: 'タイガース', players: [], atBats: [] },
      date: Date.now(),
    };

    const gameId = await repository.save(game, 'user123');
    const loaded = await repository.load(gameId);

    expect(loaded).toBeDefined();
    expect(loaded?.homeTeam.name).toBe('ホークス');
  });

  test('存在しない試合を取得するとnullを返す', async () => {
    const loaded = await repository.load('non-existent-id');
    expect(loaded).toBeNull();
  });

  test('ユーザーの試合一覧を取得できる', async () => {
    const game1: Game = { homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, date: Date.now() };
    const game2: Game = { homeTeam: { name: 'C' }, awayTeam: { name: 'D' }, date: Date.now() };

    await repository.save(game1, 'user123');
    await repository.save(game2, 'user123');
    await repository.save(game1, 'user456'); // 別ユーザー

    const games = await repository.list('user123');

    expect(games).toHaveLength(2);
  });

  test('リミットオプションが機能する', async () => {
    for (let i = 0; i < 10; i++) {
      await repository.save(
        { homeTeam: { name: `Team${i}` }, awayTeam: { name: 'B' }, date: Date.now() },
        'user123'
      );
    }

    const games = await repository.list('user123', { limit: 5 });

    expect(games).toHaveLength(5);
  });

  test('試合を削除できる', async () => {
    const game: Game = { homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, date: Date.now() };
    const gameId = await repository.save(game, 'user123');

    await repository.delete(gameId);

    const loaded = await repository.load(gameId);
    expect(loaded).toBeNull();
  });

  test('試合を更新できる', async () => {
    const game: Game = { homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, date: Date.now() };
    const gameId = await repository.save(game, 'user123');

    await repository.update(gameId, {
      homeTeam: { name: 'Updated Team', players: [], atBats: [] },
    });

    const updated = await repository.load(gameId);
    expect(updated?.homeTeam.name).toBe('Updated Team');
  });
});
```

**期待効果**:
- ✅ テスト実行時間: 30秒 → 0.5秒（60倍高速化）
- ✅ Firebase Emulator不要
- ✅ テストカバレッジ: Firebase系サービス 0% → 90%+

---

### Step 5b-4: Dependency Injection実装（0.5日）

**作成ファイル**: `src/contexts/RepositoryContext.tsx`

```typescript
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Firestore } from 'firebase/firestore';
import { IGameRepository } from '../repositories/interfaces/IGameRepository';
import { ITeamRepository } from '../repositories/interfaces/ITeamRepository';
import { IStatsRepository } from '../repositories/interfaces/IStatsRepository';
import { FirebaseGameRepository } from '../repositories/implementations/FirebaseGameRepository';
import { FirebaseTeamRepository } from '../repositories/implementations/FirebaseTeamRepository';
import { FirebaseStatsRepository } from '../repositories/implementations/FirebaseStatsRepository';

interface Repositories {
  gameRepository: IGameRepository;
  teamRepository: ITeamRepository;
  statsRepository: IStatsRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
  firestore?: Firestore;
  repositories?: Partial<Repositories>;
}

/**
 * Repositoryの依存注入を行うProvider
 * 
 * 使用例:
 * ```tsx
 * // 本番環境
 * <RepositoryProvider firestore={firestore}>
 *   <App />
 * </RepositoryProvider>
 * 
 * // テスト環境
 * <RepositoryProvider repositories={{ gameRepository: new MockGameRepository() }}>
 *   <App />
 * </RepositoryProvider>
 * ```
 */
export const RepositoryProvider: React.FC<RepositoryProviderProps> = ({
  children,
  firestore,
  repositories,
}) => {
  const defaultRepositories = useMemo<Repositories>(() => {
    if (repositories?.gameRepository && repositories?.teamRepository && repositories?.statsRepository) {
      return repositories as Repositories;
    }

    if (!firestore) {
      throw new Error('RepositoryProvider requires either firestore or repositories prop');
    }

    return {
      gameRepository: repositories?.gameRepository || new FirebaseGameRepository(firestore),
      teamRepository: repositories?.teamRepository || new FirebaseTeamRepository(firestore),
      statsRepository: repositories?.statsRepository || new FirebaseStatsRepository(firestore),
    };
  }, [firestore, repositories]);

  return (
    <RepositoryContext.Provider value={defaultRepositories}>
      {children}
    </RepositoryContext.Provider>
  );
};

/**
 * GameRepositoryを取得するHook
 */
export const useGameRepository = (): IGameRepository => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useGameRepository must be used within RepositoryProvider');
  }
  return context.gameRepository;
};

/**
 * TeamRepositoryを取得するHook
 */
export const useTeamRepository = (): ITeamRepository => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useTeamRepository must be used within RepositoryProvider');
  }
  return context.teamRepository;
};

/**
 * StatsRepositoryを取得するHook
 */
export const useStatsRepository = (): IStatsRepository => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useStatsRepository must be used within RepositoryProvider');
  }
  return context.statsRepository;
};
```

---

### Step 5b-5: 既存コードの移行（0.4日）

**変更ファイル**: `src/App.tsx`（現状 `AuthProvider` を内包しているため、まずは `RepositoryProvider` を `App` 内に追加するのが影響最小）

```typescript
// App.tsx 内（ThemeProvider/CssBaseline の下）に RepositoryProvider を追加
import { firestore } from './firebase/config';
import { RepositoryProvider } from './contexts/RepositoryContext';

return (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <RepositoryProvider firestore={firestore}>
        <MainApp toggleColorMode={toggleColorMode} mode={mode} />
      </RepositoryProvider>
    </AuthProvider>
  </ThemeProvider>
);
```

**変更ファイル**: `src/App.tsx`（または他のコンポーネント）

```typescript
// Before
import { saveGame, loadGame } from './firebase/gameService';

const handleSave = async () => {
  const gameId = await saveGame(game, user.uid);
};

// After
import { useGameRepository } from './contexts/RepositoryContext';

const gameRepository = useGameRepository();

const handleSave = async () => {
  const gameId = await gameRepository.save(game, user.uid);
};
```

**テストでの使用**:

```typescript
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { RepositoryProvider } from './contexts/RepositoryContext';
import { MockGameRepository } from './repositories/implementations/MockGameRepository';
import App from './App';

describe('App with MockRepository', () => {
  test('試合を保存できる', async () => {
    const mockRepo = new MockGameRepository();

    render(
      <RepositoryProvider repositories={{ gameRepository: mockRepo }}>
        <App />
      </RepositoryProvider>
    );

    // Firebase不要でテスト実行可能！
    // ... テストコード
  });
});
```

---

### Phase 5b受け入れ条件

- [ ] IGameRepository、ITeamRepository、IStatsRepositoryのインターフェース定義完了
- [ ] FirebaseGameRepositoryの実装完了
- [ ] MockGameRepositoryの実装完了、テストカバレッジ95%以上
- [ ] RepositoryProviderの実装完了
- [ ] 既存コードが新しいRepository経由に移行
- [ ] 全テストがMockRepositoryで実行可能
- [ ] テスト実行時間が50%以上短縮

**工数**: 2.0日

---

## 🧪 Phase 5c: E2Eテスト基盤の構築（2.0日）

### 目的

Playwrightを使用したエンドツーエンドテストを実装し、クリティカルパスの自動検証を実現する。

---

### Step 5c-1: Playwright環境構築（0.5日）

**パッケージインストール**:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**設定ファイル**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**package.json追加**:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

### Step 5c-2: 認証テストヘルパー（0.3日）

**作成ファイル**: `e2e/helpers/auth.ts`

```typescript
import { Page } from '@playwright/test';

/**
 * テスト用ユーザーでログイン
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  
  // ログインボタンをクリック
  await page.click('text=ログイン');
  
  // Firebase UIの表示を待つ
  await page.waitForSelector('input[type="email"]');
  
  // 認証情報を入力
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // ログイン実行
  await page.click('button[type="submit"]');
  
  // ログイン完了を待つ
  await page.waitForSelector('text=野球スコア');
}

/**
 * テスト用ユーザーを作成（初回のみ）
 */
export async function createTestUser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.click('text=新規登録');
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('text=野球スコア');
}

/**
 * ログアウト
 */
export async function logout(page: Page) {
  await page.click('[aria-label="メニューを開く"]');
  await page.click('text=ログアウト');
  await page.waitForSelector('text=ログイン');
}
```

---

### Step 5c-3: クリティカルパスのE2Eテスト（1.0日）

#### テスト1: 試合作成から保存まで（0.3日）

**作成ファイル**: `e2e/game-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('試合作成フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await login(page, 'test@example.com', 'testpassword123');
  });

  test('新しい試合を作成して保存できる', async ({ page }) => {
    // 初期画面の確認
    await expect(page.locator('h1')).toContainText('野球スコア');

    // チーム名を設定
    await page.fill('input[name="home-team-name"]', 'ホークス');
    await page.fill('input[name="away-team-name"]', 'タイガース');

    // 選手を追加（ホームチーム）
    await page.click('text=ホームチーム選手追加');
    await page.fill('input[name="player-name"]', '山田太郎');
    await page.fill('input[name="player-number"]', '1');
    await page.click('text=追加');

    // 打席を記録
    await page.click('text=打席を追加');
    await page.selectOption('select[name="player"]', '山田太郎');
    await page.click('button[aria-label="内野安打"]');
    await page.click('text=登録');

    // スコアボードに反映されることを確認
    await expect(page.locator('[data-testid="score-board"]')).toContainText('1');

    // 試合を保存
    await page.click('button:has-text("保存")');
    
    // 保存ダイアログ
    await page.fill('input[name="game-title"]', 'テスト試合1');
    await page.click('button:has-text("保存実行")');

    // 保存成功メッセージ
    await expect(page.locator('text=保存しました')).toBeVisible();

    // 試合一覧で確認
    await page.click('button:has-text("一覧表示")');
    await expect(page.locator('text=テスト試合1')).toBeVisible();
  });

  test('保存した試合を読み込んで続きから入力できる', async ({ page }) => {
    // 試合一覧を開く
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=試合一覧');

    // 最新の試合を開く
    await page.click('text=テスト試合1');

    // データが復元されていることを確認
    await expect(page.locator('input[name="home-team-name"]')).toHaveValue('ホークス');
    await expect(page.locator('input[name="away-team-name"]')).toHaveValue('タイガース');

    // 追加の打席を記録
    await page.click('text=打席を追加');
    await page.selectOption('select[name="player"]', '山田太郎');
    await page.click('button[aria-label="三振"]');
    await page.click('text=登録');

    // 上書き保存
    await page.click('button:has-text("保存")');
    await page.click('button:has-text("上書き保存")');

    await expect(page.locator('text=保存しました')).toBeVisible();
  });

  test('試合を削除できる', async ({ page }) => {
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=試合一覧');

    // 削除ボタンをクリック
    await page.click('[aria-label="テスト試合1を削除"]');
    
    // 確認ダイアログ
    await page.click('button:has-text("削除する")');

    // 削除成功メッセージ
    await expect(page.locator('text=削除しました')).toBeVisible();

    // 一覧から消えていることを確認
    await expect(page.locator('text=テスト試合1')).not.toBeVisible();
  });
});
```

#### テスト2: チーム管理フロー（0.3日）

**作成ファイル**: `e2e/team-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('チーム管理フロー', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'testpassword123');
  });

  test('新しいチームを作成できる', async ({ page }) => {
    // チーム管理画面を開く
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=選手管理');

    // タイトルの確認
    await expect(page.locator('h1')).toContainText('選手管理');

    // 新しいチームを作成
    await page.click('text=新しいチーム');
    await page.fill('input[name="team-name"]', 'テストチーム');
    await page.click('button:has-text("作成")');

    // チーム一覧に表示されることを確認
    await expect(page.locator('text=テストチーム')).toBeVisible();
  });

  test('チームに選手を追加できる', async ({ page }) => {
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=選手管理');

    // チームを選択
    await page.click('text=テストチーム');

    // 選手を追加
    await page.click('text=選手を追加');
    await page.fill('input[name="player-name"]', '鈴木一郎');
    await page.fill('input[name="player-number"]', '51');
    await page.selectOption('select[name="position"]', '外野手');
    await page.click('button:has-text("追加")');

    // 選手一覧に表示されることを確認
    await expect(page.locator('text=51 鈴木一郎')).toBeVisible();
    await expect(page.locator('text=外野手')).toBeVisible();
  });

  test('選手の打順を並び替えられる', async ({ page }) => {
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=選手管理');
    await page.click('text=テストチーム');

    // 2人目の選手を追加
    await page.click('text=選手を追加');
    await page.fill('input[name="player-name"]', '田中二郎');
    await page.fill('input[name="player-number"]', '25');
    await page.click('button:has-text("追加")');

    // ドラッグ&ドロップで並び替え
    const firstPlayer = page.locator('[data-player-id="1"]');
    const secondPlayer = page.locator('[data-player-id="2"]');

    await firstPlayer.dragTo(secondPlayer);

    // 順番が変わったことを確認
    const playerList = page.locator('[data-testid="player-list"] li');
    await expect(playerList.first()).toContainText('田中二郎');
    await expect(playerList.last()).toContainText('鈴木一郎');
  });
});
```

#### テスト3: 成績表示フロー（0.2日）

**作成ファイル**: `e2e/stats-display.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('成績表示フロー', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'testpassword123');
  });

  test('通算成績を表示できる', async ({ page }) => {
    // 成績画面を開く
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=通算成績');

    // タイトルの確認
    await expect(page.locator('h1')).toContainText('通算成績');

    // 選手の成績が表示されることを確認
    await expect(page.locator('[data-testid="stats-table"]')).toBeVisible();
    
    // 打率、打点などの指標が表示されることを確認
    await expect(page.locator('th:has-text("打率")')).toBeVisible();
    await expect(page.locator('th:has-text("打点")')).toBeVisible();
    await expect(page.locator('th:has-text("本塁打")')).toBeVisible();
  });

  test('チーム別にフィルタリングできる', async ({ page }) => {
    await page.click('[aria-label="メニューを開く"]');
    await page.click('text=通算成績');

    // チームフィルタを選択
    await page.selectOption('select[name="team-filter"]', 'テストチーム');

    // フィルタされた結果が表示されることを確認
    await expect(page.locator('text=鈴木一郎')).toBeVisible();
  });
});
```

---

### Step 5c-4: Visual Regression Testing（Optional）（0.2日）

**作成ファイル**: `e2e/visual-regression.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('ビジュアルリグレッションテスト', () => {
  test('スコアボードのスクリーンショットが一致する', async ({ page }) => {
    await login(page, 'test@example.com', 'testpassword123');

    // スコアボードのスクリーンショットを撮影
    const scoreBoard = page.locator('[data-testid="score-board"]');
    await expect(scoreBoard).toHaveScreenshot('score-board.png');
  });

  test('ダークモードのスクリーンショットが一致する', async ({ page }) => {
    await login(page, 'test@example.com', 'testpassword123');

    // ダークモードに切り替え
    await page.click('[aria-label="ダークモード切り替え"]');

    // 全体のスクリーンショットを撮影
    await expect(page).toHaveScreenshot('dark-mode.png', {
      fullPage: true,
    });
  });

  test('モバイル表示のスクリーンショットが一致する', async ({ page }) => {
    // ビューポートをモバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, 'test@example.com', 'testpassword123');

    await expect(page).toHaveScreenshot('mobile-view.png');
  });
});
```

---

### Step 5c-5: CI/CDへの統合（0.2日）

**作成ファイル**: `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

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

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Build app
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 7

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots-${{ matrix.browser }}
          path: test-results/
          retention-days: 7
```

**package.json追加**:

```json
{
  "scripts": {
    "test:e2e:ci": "playwright test --reporter=github"
  }
}
```

---

### Phase 5c受け入れ条件

- [ ] Playwright環境構築完了
- [ ] 試合作成フローのE2Eテスト実装（3シナリオ）
- [ ] チーム管理フローのE2Eテスト実装（3シナリオ）
- [ ] 成績表示フローのE2Eテスト実装（2シナリオ）
- [ ] Visual Regression Testingの実装（Optional）
- [ ] CI/CDへの統合完了
- [ ] 全E2Eテストがパス
- [ ] chromium、firefox、webkitでテスト実行

**工数**: 2.0日

---

## 📊 v4.0全体の効果測定

### 定量的効果

| 指標 | Phase 5a | Phase 5b | Phase 5c | 合計 |
|------|----------|----------|----------|------|
| テストカバレッジ向上 | +20% | +15% | +10% | **+45%** |
| App.tsx行数削減 | -1,207行 | - | - | **-1,207行** |
| テスト実行時間短縮 | -10秒 | -20秒 | - | **-30秒** |
| 新規バグ検出数 | +5個 | +3個 | +8個 | **+16個** |

### 定性的効果

#### コード品質
- ✅ **可読性**: カスタムHooksにより責務が明確化
- ✅ **保守性**: ビジネスロジックの分離により変更影響範囲が限定
- ✅ **拡張性**: Repositoryパターンにより新機能追加が容易
- ✅ **信頼性**: E2Eテストによりリグレッション検出が自動化

#### 開発体験
- ✅ **テストの書きやすさ**: MockRepositoryにより単体テストが簡単
- ✅ **デバッグのしやすさ**: 責務が分離されているため問題箇所の特定が容易
- ✅ **レビューのしやすさ**: ファイルサイズが小さく差分が明確
- ✅ **学習のしやすさ**: アーキテクチャが整理されており新メンバーの理解が速い

---

## 🎯 実装スケジュール

### 推奨アプローチ: 段階的実装

```
Week 1-2: Phase 5a（プロトタイプ）
  Day 1-3: useGameStateとScoreCalculatorを実装
  Day 4-5: テストカバレッジ測定、効果検証
  → 効果が確認できれば続行、問題があれば方針見直し

Week 3-4: Phase 5a（本格展開）
  Day 1-3: 残りのHooksとサービス実装
  Day 4-5: App.tsxリファクタリング、統合テスト

Week 5-6: Phase 5b
  Day 1-2: Repositoryインターフェースと実装
  Day 3-4: Dependency Injection実装
  Day 5: 既存コードの移行、テスト

Week 7-8: Phase 5c
  Day 1-2: Playwright環境構築、認証ヘルパー
  Day 3-5: クリティカルパスのE2Eテスト実装
  Day 6-7: CI/CD統合、ドキュメント整備
  Day 8: 最終検証、リリース準備
```

### マイルストーン

| Week | マイルストーン | 検証項目 |
|------|--------------|---------|
| 2週目 | Phase 5a MVP完成 | カバレッジ+10%達成 |
| 4週目 | Phase 5a完成 | App.tsx < 500行達成 |
| 6週目 | Phase 5b完成 | テスト実行時間-50%達成 |
| 8週目 | Phase 5c完成 | E2Eテスト8件以上実装 |

---

## 🔄 ロールバック戦略

### Phase別ロールバックポイント

**Phase 5a**:
- Step 5a-1: カスタムHooksのみロールバック
- Step 5a-2: サービス層のみロールバック
- Step 5a-3: App.tsxの変更のみロールバック

**Phase 5b**:
- Step 5b-1～5b-3: Repository実装のみロールバック（既存コードはそのまま）
- Step 5b-4～5b-5: DI実装と移行をロールバック

**Phase 5c**:
- E2Eテストは既存コードに影響しないため、いつでも無効化可能

### ロールバック手順

```bash
# 特定のPhaseをロールバック
git revert <phase-5a-merge-commit>

# 部分的なロールバック
git revert <specific-commit>

# 完全ロールバック（v3.0に戻る）
git checkout v3.0
git checkout -b rollback-v4
```

---

## 🚀 v4.0実装開始の判断基準

### 即座に実施すべき場合

- ✅ v3.0完了後、カバレッジ30-60%を達成している
- ✅ チーム規模が3人以上に拡大する予定がある
- ✅ 新機能開発の頻度が週1回以上ある
- ✅ バグ修正時間が開発時間を圧迫している
- ✅ App.tsxの変更が頻繁で影響範囲が不明確

### 様子見が妥当な場合

- ⚠️ v3.0完了直後で効果測定期間が必要
- ⚠️ チームが1-2人で安定している
- ⚠️ 新機能開発の頻度が低い
- ⚠️ 現状のカバレッジで品質が安定している
- ⚠️ 他の優先度の高い機能開発がある

### 推奨タイミング

**v3.0完了から3ヶ月後**に以下を評価：

1. テストカバレッジの推移
2. バグ発生頻度
3. 開発速度の変化
4. チーム規模の変化
5. 技術的負債の蓄積状況

→ 3ヶ月間の効果測定データを元に、v4.0着手を最終判断

---

## 📈 投資対効果（ROI）分析

### 初期投資

- **工数**: 8週間（1人）または 4週間（2人）
- **時間**: 約160時間
- **コスト**: 開発者単価 × 160時間

### 期待リターン

**短期的効果（6ヶ月以内）**:
- バグ修正時間削減: 40時間 → **投資回収期間4ヶ月**
- テスト実行時間短縮: 年間50時間相当
- リファクタリング時の安全性向上: 無形価値

**中長期的効果（1年以降）**:
- 開発速度向上: 50%スピードアップ → 年間200時間の追加開発時間
- 新メンバーのオンボード時間短縮: 1週間 → 3日（4日短縮）
- 技術的負債の返済: 今後の大規模改修リスク軽減

**定量化**:
```
初期投資: 160時間
1年目リターン: 290時間（修正40h + 短縮50h + 追加200h）
ROI: (290 - 160) / 160 = 81%
```

**結論**: **投資する価値は極めて高い**

---

## 📝 ドキュメント整備

### v4.0完了時に作成すべきドキュメント

1. **アーキテクチャドキュメント** (`docs/architecture.md`)
   - カスタムHooksの責務と使用方法
   - Repositoryパターンの実装詳細
   - 依存注入の仕組み

2. **テスト戦略ドキュメント** (`docs/testing-strategy.md`)
   - 単体テスト、統合テスト、E2Eテストの方針
   - テストカバレッジ目標と測定方法
   - MockRepositoryの使用方法

3. **コントリビューターガイド** (`CONTRIBUTING.md`)
   - 新機能追加時のガイドライン
   - Hooksとサービスの作成ルール
   - テストの書き方

4. **マイグレーションガイド** (`docs/migration-v3-to-v4.md`)
   - v3.0からv4.0への移行手順
   - 破壊的変更の一覧
   - ロールバック方法

---

## 🔗 参考資料

### アーキテクチャパターン

- [Clean Architecture in React](https://dev.to/rubemfsv/clean-architecture-applying-with-react-40h6)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection in React](https://javascript.plainenglish.io/dependency-injection-in-react-a6c3d5d0db76)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

### テスト戦略

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [React Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)

### リファクタリング手法

- [Refactoring by Martin Fowler](https://refactoring.com/)
- [Working Effectively with Legacy Code](https://www.goodreads.com/book/show/44919.Working_Effectively_with_Legacy_Code)
- [React Patterns](https://reactpatterns.com/)

---

## 📅 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|---------|--------|
| 4.0 | 2025-10-07 | 初版作成：Phase 5以降の詳細実装計画 | AI Assistant |

---

## 📞 質問・相談

v4.0の実装に関する質問や相談は、以下の方法で受け付けます：

1. **GitHubイシュー**: 技術的な質問や提案
2. **プルリクエスト**: 具体的な実装に関するレビュー
3. **ドキュメント更新**: 不明点や改善提案

**v4.0は段階的に実装可能です。まずはPhase 5aのプロトタイプから始め、効果を検証しながら進めることを推奨します。**

