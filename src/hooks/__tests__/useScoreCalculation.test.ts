import { act, renderHook } from '@testing-library/react';
import { useScoreCalculation } from '../useScoreCalculation';
import { useGameState } from '../useGameState';
import { Team, RunEvent } from '../../types';

describe('useScoreCalculation', () => {
  const mockHomeTeam: Team = {
    id: 'home',
    name: 'ホークス',
    players: [],
    atBats: [
      {
        id: 'ab1',
        playerId: '1',
        result: 'IH',
        inning: 1,
        rbi: 1,
        isOut: false,
        isTop: false,
      },
      {
        id: 'ab2',
        playerId: '2',
        result: 'HR',
        inning: 2,
        rbi: 1,
        isOut: false,
        isTop: false,
      },
      {
        id: 'ab3',
        playerId: '3',
        result: 'SO',
        inning: 3,
        rbi: 0,
        isOut: true,
        isTop: false,
      },
    ],
  };

  const mockAwayTeam: Team = {
    id: 'away',
    name: 'タイガース',
    players: [],
    atBats: [
      {
        id: 'ab4',
        playerId: '1',
        result: '2B',
        inning: 1,
        rbi: 0,
        isOut: false,
        isTop: true,
      },
      {
        id: 'ab5',
        playerId: '2',
        result: 'E',
        inning: 2,
        rbi: 0,
        isOut: false,
        isTop: true,
      },
    ],
  };

  const mockRunEvents: RunEvent[] = [
    {
      id: 're1',
      inning: 1,
      isTop: false,
      runType: 'その他',
      runCount: 0,
      timestamp: Date.now(),
    },
    {
      id: 're2',
      inning: 2,
      isTop: false,
      runType: 'その他',
      runCount: 3,
      timestamp: Date.now(),
    },
    {
      id: 're3',
      inning: 1,
      isTop: true,
      runType: 'その他',
      runCount: 2,
      timestamp: Date.now(),
    },
  ];

  test('合計スコアを正しく計算する', () => {
    const { result } = renderHook(() =>
      useScoreCalculation(mockHomeTeam, mockAwayTeam, mockRunEvents)
    );

    expect(result.current.homeScore.totalScore).toBe(2 + 3);
    expect(result.current.awayScore.totalScore).toBe(0 + 2);
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
    expect(result.current.homeScore.errors).toBe(1);
    expect(result.current.awayScore.errors).toBe(0);
  });

  test.each([true, false])(
    '打席の追加・編集・削除を相手の失策数に反映する (isTop=%s)',
    (isTop) => {
      const { result } = renderHook(() => {
        const { state, actions } = useGameState({
          id: 'game',
          date: '2026-10-24',
          currentInning: 1,
          homeTeam: { ...mockHomeTeam, atBats: [] },
          awayTeam: { ...mockAwayTeam, atBats: [] },
        });
        return {
          actions,
          ...useScoreCalculation(
            state.homeTeam,
            state.awayTeam,
            state.runEvents
          ),
        };
      });
      const atBat = { ...mockAwayTeam.atBats[1], isTop };
      const battingScore = isTop ? 'awayScore' : 'homeScore';
      const fieldingScore = isTop ? 'homeScore' : 'awayScore';

      act(() => result.current.actions.addAtBat(atBat));
      expect(result.current[fieldingScore].errors).toBe(1);
      expect(result.current[battingScore].errors).toBe(0);
      expect(result.current[battingScore].hits).toBe(0);
      expect(result.current[battingScore].totalScore).toBe(0);

      act(() => result.current.actions.updateAtBat({ ...atBat, result: 'IH' }));
      expect(result.current[fieldingScore].errors).toBe(0);
      expect(result.current[battingScore].hits).toBe(1);

      act(() => result.current.actions.updateAtBat(atBat));
      expect(result.current[fieldingScore].errors).toBe(1);
      act(() => result.current.actions.deleteAtBat(atBat.id));
      expect(result.current[fieldingScore].errors).toBe(0);
      expect(result.current[battingScore].errors).toBe(0);
    }
  );
});
