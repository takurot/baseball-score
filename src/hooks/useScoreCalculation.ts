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
const HIT_RESULTS = ['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR'];

const calculateTotalScore = (
  team: Team,
  isAwayTeam: boolean,
  runEvents: RunEvent[]
): number => {
  const atBatTotal = team.atBats.reduce((sum, ab) => sum + (ab.rbi || 0), 0);
  const runEventTotal = runEvents
    .filter((e) => e.isTop === isAwayTeam)
    .reduce((sum, e) => sum + (e.runCount || 0), 0);
  return atBatTotal + runEventTotal;
};

const calculateInningScores = (
  team: Team,
  isAwayTeam: boolean,
  runEvents: RunEvent[],
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

const calculateHits = (team: Team): number =>
  team.atBats.filter((ab) => HIT_RESULTS.includes(ab.result)).length;

const calculateErrors = (team: Team): number =>
  team.atBats.filter((ab) => ab.result === 'E').length;

const determineMaxInning = (runEvents: RunEvent[]): number => {
  if (runEvents.length === 0) {
    return 7;
  }
  return Math.max(7, ...runEvents.map((e) => e.inning));
};

export const useScoreCalculation = (
  homeTeam: Team,
  awayTeam: Team,
  runEvents: RunEvent[]
): UseScoreCalculationReturn => {
  const maxInning = useMemo(() => determineMaxInning(runEvents), [runEvents]);

  const homeScore = useMemo<ScoreData>(
    () => ({
      totalScore: calculateTotalScore(homeTeam, false, runEvents),
      inningScores: calculateInningScores(
        homeTeam,
        false,
        runEvents,
        maxInning
      ),
      hits: calculateHits(homeTeam),
      errors: calculateErrors(homeTeam),
    }),
    [homeTeam, runEvents, maxInning]
  );

  const awayScore = useMemo<ScoreData>(
    () => ({
      totalScore: calculateTotalScore(awayTeam, true, runEvents),
      inningScores: calculateInningScores(awayTeam, true, runEvents, maxInning),
      hits: calculateHits(awayTeam),
      errors: calculateErrors(awayTeam),
    }),
    [awayTeam, runEvents, maxInning]
  );

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
