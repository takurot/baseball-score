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

  describe('calculateBattingStats', () => {
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
      expect(ScoreCalculator.calculateBattingStats(atBats).battingAvg).toBe(
        0.5
      );
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
      expect(ScoreCalculator.calculateBattingStats(atBats).battingAvg).toBe(
        0.5
      );
    });
  });

  describe('OPS', () => {
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
      const { ops } = ScoreCalculator.calculateBattingStats(atBats);
      expect(ops).toBeGreaterThan(0);
    });
  });

  describe('出塁率', () => {
    test('犠打を出塁率の分母に含めない', () => {
      const atBats: AtBat[] = [
        {
          id: 'a1',
          playerId: 'p1',
          result: 'HR',
          inning: 1,
          rbi: 1,
          isOut: false,
          isTop: true,
        },
        {
          id: 'a2',
          playerId: 'p1',
          result: 'SAC',
          inning: 1,
          rbi: 0,
          isOut: true,
          isTop: true,
        },
      ];

      expect(ScoreCalculator.calculateBattingStats(atBats).obp).toBe(1);
    });

    test('犠飛を出塁率の分母に含める', () => {
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
          playerId: 'p1',
          result: 'SF',
          inning: 1,
          rbi: 1,
          isOut: true,
          isTop: true,
        },
      ];

      expect(ScoreCalculator.calculateBattingStats(atBats).obp).toBe(0.5);
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

  describe('calculateBattingStats: 犠打と打席の内訳', () => {
    const at = (id: string, result: AtBat['result']): AtBat => ({
      id,
      playerId: 'p',
      result,
      inning: 1,
      isTop: true,
      rbi: 0,
      isOut: false,
    });

    test('犠打(SAC)を数え、打数には含めない', () => {
      const stats = ScoreCalculator.calculateBattingStats([
        at('1', 'SAC'),
        at('2', 'SAC'),
        at('3', 'SF'),
        at('4', 'BB'),
        at('5', 'HBP'),
        at('6', 'IH'),
        at('7', 'SO'),
      ]);
      expect(stats.sacrificeBunts).toBe(2);
      expect(stats.sacrificeFlies).toBe(1);
      expect(stats.walks).toBe(2);
      expect(stats.atBats).toBe(2);
    });

    test('打席 = 打数 + 四死球 + 犠打 + 犠飛 が常に成り立つ', () => {
      const results: AtBat['result'][] = [
        'IH',
        '2B',
        '3B',
        'HR',
        'GO_SS',
        'FO_LF',
        'SO',
        'E',
        'DP',
        'LO',
        'BB',
        'HBP',
        'SAC',
        'SF',
      ];
      const atBats = results.map((result, i) => at(String(i), result));
      const stats = ScoreCalculator.calculateBattingStats(atBats);
      expect(
        stats.atBats + stats.walks + stats.sacrificeBunts + stats.sacrificeFlies
      ).toBe(atBats.length);
    });

    test('丸め境界: 出塁率.273・長打率.455 でも OPS は未丸めの和から .727 になる', () => {
      // 11打数3安打(三塁打1・単打2): 出塁率 3/11、長打率 5/11
      const results: AtBat['result'][] = [
        '3B',
        'IH',
        'IH',
        ...(Array(8).fill('GO_SS') as AtBat['result'][]),
      ];
      const stats = ScoreCalculator.calculateBattingStats(
        results.map((result, i) => at(String(i), result))
      );
      expect(stats.obp.toFixed(3)).toBe('0.273');
      expect(stats.slg.toFixed(3)).toBe('0.455');
      expect(stats.ops.toFixed(3)).toBe('0.727');
      // 表示された2つの和は .728 で、OPS の .727 と .001 違う（誤りではない）
      expect(
        Number(stats.obp.toFixed(3)) + Number(stats.slg.toFixed(3))
      ).toBeCloseTo(0.728, 5);
    });
  });
});
