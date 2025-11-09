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

