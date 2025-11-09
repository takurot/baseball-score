import { renderHook } from '@testing-library/react';
import { useScoreCalculation } from '../useScoreCalculation';
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
    expect(result.current.awayScore.errors).toBe(1); // E
  });
});
