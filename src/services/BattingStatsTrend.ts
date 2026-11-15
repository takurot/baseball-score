import { AtBat, Game, TrendPoint } from '../types';
import { ScoreCalculator } from './ScoreCalculator';
import { GameTypeFilter, matchesGameTypeFilter } from '../utils/gameType';

export interface TrendTarget {
  teamId: string;
  // Omit for the whole team.
  playerId?: string;
}

const COUNT_KEYS = [
  'atBats',
  'hits',
  'singles',
  'doubles',
  'triples',
  'homeRuns',
  'walks',
  'sacrificeFlies',
] as const;

type Counts = Record<(typeof COUNT_KEYS)[number], number>;

const isCalendarDate = (date: unknown): date is string => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const compareCodeUnits = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

// One point per game of the target team, cumulative through that game.
export const buildBattingTrend = (
  games: readonly Game[],
  filter: GameTypeFilter,
  target: TrendTarget
): TrendPoint[] => {
  const ordered = games
    .filter(
      (game) =>
        matchesGameTypeFilter(game, filter) &&
        (game.homeTeam.id === target.teamId ||
          game.awayTeam.id === target.teamId)
    )
    .map((game) => {
      if (!isCalendarDate(game.date)) {
        throw new Error(
          `試合日付が不正なため推移を作成できません（試合ID: ${game.id}、日付: ${game.date || '未設定'}）`
        );
      }
      return game;
    })
    .sort(
      (a, b) => compareCodeUnits(a.date, b.date) || compareCodeUnits(a.id, b.id)
    );

  const gamesPerDate = new Map<string, number>();
  for (const game of ordered) {
    gamesPerDate.set(game.date, (gamesPerDate.get(game.date) ?? 0) + 1);
  }

  const counts: Counts = {
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    sacrificeFlies: 0,
  };
  let plateAppearances = 0;
  const seenPerDate = new Map<string, number>();

  return ordered.map((game) => {
    const sides = [game.homeTeam, game.awayTeam].filter(
      (team) => team.id === target.teamId
    );
    const atBats: AtBat[] = sides
      .flatMap((team) => team.atBats)
      .filter(
        (atBat) =>
          target.playerId === undefined || atBat.playerId === target.playerId
      );
    const added = ScoreCalculator.calculateBattingStats(atBats);
    for (const key of COUNT_KEYS) counts[key] += added[key];
    plateAppearances += atBats.length;

    const nth = (seenPerDate.get(game.date) ?? 0) + 1;
    seenPerDate.set(game.date, nth);
    const opponent =
      game.homeTeam.id === target.teamId ? game.awayTeam : game.homeTeam;

    return {
      game: {
        id: game.id,
        date: game.date,
        label:
          gamesPerDate.get(game.date)! > 1
            ? `${game.date} (${nth})`
            : game.date,
        opponentName: opponent.name.trim() || '相手未設定',
      },
      rates:
        plateAppearances > 0
          ? ScoreCalculator.calculateBattingRates(counts)
          : null,
    };
  });
};
