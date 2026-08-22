import { useMemo } from 'react';
import { Team, RunEvent } from '../types';
import { ScoreCalculator } from '../services/ScoreCalculator';

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
const calculateInningScores = (
  team: Team,
  isAwayTeam: boolean,
  runEvents: RunEvent[],
  maxInning: number
): number[] => {
  const scores: number[] = [];
  for (let i = 1; i <= maxInning; i++) {
    scores.push(
      ScoreCalculator.calculateTeamInningScore(team, runEvents, i, isAwayTeam)
    );
  }
  return scores;
};

const calculateHits = (team: Team): number =>
  ScoreCalculator.calculateHits(team.atBats);

const calculateErrors = (team: Team): number =>
  ScoreCalculator.calculateErrors(team.atBats);

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
      totalScore: ScoreCalculator.calculateTotalScore(
        homeTeam,
        runEvents,
        false
      ),
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
      totalScore: ScoreCalculator.calculateTotalScore(
        awayTeam,
        runEvents,
        true
      ),
      inningScores: calculateInningScores(awayTeam, true, runEvents, maxInning),
      hits: calculateHits(awayTeam),
      errors: calculateErrors(awayTeam),
    }),
    [awayTeam, runEvents, maxInning]
  );

  const calculateInningScore = (team: Team, inning: number): number => {
    const isAwayTeam = team === awayTeam;
    return ScoreCalculator.calculateTeamInningScore(
      team,
      runEvents,
      inning,
      isAwayTeam
    );
  };

  return { homeScore, awayScore, calculateInningScore };
};
