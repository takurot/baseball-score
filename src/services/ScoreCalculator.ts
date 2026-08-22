import { RunEvent, AtBat, HitResult, Team } from '../types';

export const SINGLE_RESULTS: readonly HitResult[] = ['IH', 'LH', 'CH', 'RH'];
export const HIT_RESULTS: readonly HitResult[] = [
  ...SINGLE_RESULTS,
  '2B',
  '3B',
  'HR',
];
export const NON_AT_BAT_RESULTS: readonly HitResult[] = [
  'BB',
  'HBP',
  'SAC',
  'SF',
];

export interface BattingStats {
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  sacrificeFlies: number;
  strikeouts: number;
  rbis: number;
  battingAvg: number;
  obp: number;
  slg: number;
  ops: number;
}

type BattingRateCounts = Pick<
  BattingStats,
  | 'atBats'
  | 'hits'
  | 'singles'
  | 'doubles'
  | 'triples'
  | 'homeRuns'
  | 'walks'
  | 'sacrificeFlies'
>;

/**
 * スコアと打撃成績を計算する純粋関数群
 */
export class ScoreCalculator {
  static calculateInningScore(
    runEvents: RunEvent[],
    inning: number,
    isTop: boolean
  ): number {
    return runEvents
      .filter((event) => event.inning === inning && event.isTop === isTop)
      .reduce((sum, event) => sum + (event.runCount || 0), 0);
  }

  static calculateTotalRunEvents(
    runEvents: RunEvent[],
    isTop: boolean
  ): number {
    return runEvents
      .filter((event) => event.isTop === isTop)
      .reduce((sum, event) => sum + (event.runCount || 0), 0);
  }

  static calculateTeamInningScore(
    team: Team,
    runEvents: RunEvent[],
    inning: number,
    isAwayTeam: boolean
  ): number {
    const atBatRuns = team.atBats
      .filter((atBat) => atBat.inning === inning)
      .reduce((sum, atBat) => sum + (atBat.rbi || 0), 0);
    return atBatRuns + this.calculateInningScore(runEvents, inning, isAwayTeam);
  }

  static calculateTotalScore(
    team: Team,
    runEvents: RunEvent[],
    isAwayTeam: boolean
  ): number {
    const atBatRuns = team.atBats.reduce(
      (sum, atBat) => sum + (atBat.rbi || 0),
      0
    );
    return atBatRuns + this.calculateTotalRunEvents(runEvents, isAwayTeam);
  }

  static calculateHits(atBats: AtBat[]): number {
    return atBats.filter((atBat) => HIT_RESULTS.includes(atBat.result)).length;
  }

  static calculateErrors(atBats: AtBat[]): number {
    return atBats.filter((atBat) => atBat.result === 'E').length;
  }

  static calculateBattingRates(
    counts: BattingRateCounts
  ): Pick<BattingStats, 'battingAvg' | 'obp' | 'slg' | 'ops'> {
    const battingAvg = counts.atBats > 0 ? counts.hits / counts.atBats : 0;
    const onBaseDenominator =
      counts.atBats + counts.walks + counts.sacrificeFlies;
    const obp =
      onBaseDenominator > 0
        ? (counts.hits + counts.walks) / onBaseDenominator
        : 0;
    const totalBases =
      counts.singles +
      counts.doubles * 2 +
      counts.triples * 3 +
      counts.homeRuns * 4;
    const slg = counts.atBats > 0 ? totalBases / counts.atBats : 0;

    return { battingAvg, obp, slg, ops: obp + slg };
  }

  static calculateBattingStats(atBats: AtBat[]): BattingStats {
    const stats: BattingStats = {
      atBats: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      sacrificeFlies: 0,
      strikeouts: 0,
      rbis: 0,
      battingAvg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
    };

    for (const atBat of atBats) {
      stats.rbis += atBat.rbi || 0;

      if (NON_AT_BAT_RESULTS.includes(atBat.result)) {
        if (atBat.result === 'BB' || atBat.result === 'HBP') {
          stats.walks++;
        } else if (atBat.result === 'SF') {
          stats.sacrificeFlies++;
        }
        continue;
      }

      stats.atBats++;
      if (atBat.result === 'SO') {
        stats.strikeouts++;
      }
      if (SINGLE_RESULTS.includes(atBat.result)) {
        stats.hits++;
        stats.singles++;
      } else if (atBat.result === '2B') {
        stats.hits++;
        stats.doubles++;
      } else if (atBat.result === '3B') {
        stats.hits++;
        stats.triples++;
      } else if (atBat.result === 'HR') {
        stats.hits++;
        stats.homeRuns++;
      }
    }

    return { ...stats, ...this.calculateBattingRates(stats) };
  }

  static calculateBattingAverage(atBats: AtBat[]): number {
    return this.calculateBattingStats(atBats).battingAvg;
  }

  static calculateSluggingPercentage(atBats: AtBat[]): number {
    return this.calculateBattingStats(atBats).slg;
  }

  static calculateOnBasePercentage(atBats: AtBat[]): number {
    return this.calculateBattingStats(atBats).obp;
  }

  static calculateOPS(atBats: AtBat[]): number {
    return this.calculateBattingStats(atBats).ops;
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
