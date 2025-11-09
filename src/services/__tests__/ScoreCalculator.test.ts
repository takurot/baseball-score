import { ScoreCalculator } from '../ScoreCalculator';
import { AtBat, RunEvent } from '../../types';

describe('ScoreCalculator', () => {
  describe('calculateInningScore', () => {
    test('指定イニングのスコアを計算する', () => {
      const runEvents: RunEvent[] = [
        {
          id: '1',
          inning: 1,
          isTop: true,
          runType: 'その他',
          runCount: 2,
          timestamp: Date.now(),
        },
        {
          id: '2',
          inning: 1,
          isTop: false,
          runType: 'その他',
          runCount: 1,
          timestamp: Date.now(),
        },
        {
          id: '3',
          inning: 2,
          isTop: true,
          runType: 'その他',
          runCount: 3,
          timestamp: Date.now(),
        },
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
        {
          id: 'a1',
          playerId: 'p1',
          result: 'IH',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a2',
          playerId: 'p2',
          result: 'SO',
          inning: 1,
          rbi: 0,
          isOut: true,
          isTop: true,
        },
        {
          id: 'a3',
          playerId: 'p3',
          result: '2B',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a4',
          playerId: 'p4',
          result: 'GO_SS',
          inning: 1,
          rbi: 0,
          isOut: true,
          isTop: true,
        },
      ];
      expect(ScoreCalculator.calculateBattingAverage(atBats)).toBe(0.5);
    });

    test('四球は打数に含めない', () => {
      const atBats: AtBat[] = [
        {
          id: 'a1',
          playerId: 'p1',
          result: 'IH',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a2',
          playerId: 'p2',
          result: 'BB',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a3',
          playerId: 'p3',
          result: 'SO',
          inning: 1,
          rbi: 0,
          isOut: true,
          isTop: true,
        },
      ];
      expect(ScoreCalculator.calculateBattingAverage(atBats)).toBe(0.5);
    });
  });

  describe('calculateOPS', () => {
    test('OPSを正しく計算する', () => {
      const atBats: AtBat[] = [
        {
          id: 'a1',
          playerId: 'p1',
          result: 'IH',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a2',
          playerId: 'p2',
          result: 'HR',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a3',
          playerId: 'p3',
          result: 'SO',
          inning: 1,
          rbi: 0,
          isOut: true,
          isTop: true,
        },
        {
          id: 'a4',
          playerId: 'p4',
          result: 'BB',
          inning: 1,
          rbi: 0,
          isOut: false,
          isTop: true,
        },
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
