import { AtBat, Game, HitResult, Team } from '../types';
import { buildBattingTrend } from './BattingStatsTrend';
import { aggregateTeamStats } from '../firebase/statsService';

jest.mock('../firebase/config', () => ({ db: {} }));
jest.mock('../firebase/authService', () => ({}));
jest.mock('../firebase/teamService', () => ({}));

let atBatSeq = 0;
const ab = (playerId: string, result: HitResult): AtBat => ({
  id: `ab-${atBatSeq++}`,
  playerId,
  result,
  inning: 1,
  isTop: false,
  rbi: 0,
  isOut: false,
});

const side = (id: string, atBats: AtBat[] = [], name = id): Team => ({
  id,
  name,
  players: [],
  atBats,
});

const game = (
  id: string,
  date: string,
  home: Team,
  away: Team = side('opp', [], '相手'),
  extra: Partial<Game> = {}
): Game => ({
  id,
  date,
  homeTeam: home,
  awayTeam: away,
  currentInning: 1,
  gameType: 'official',
  ...extra,
});

const rates = (game: ReturnType<typeof buildBattingTrend>[number]) =>
  game.rates && {
    battingAvg: Number(game.rates.battingAvg.toFixed(3)),
    obp: Number(game.rates.obp.toFixed(3)),
    slg: Number(game.rates.slg.toFixed(3)),
    ops: Number(game.rates.ops.toFixed(3)),
  };

test('recomputes rates from summed counts instead of averaging per-game rates', () => {
  const games = [
    game('g1', '2026-04-01', side('t', [ab('p', 'IH'), ab('p', 'SO')])),
    game(
      'g2',
      '2026-04-08',
      side('t', [ab('p', 'GO_SS'), ab('p', 'SO'), ab('p', 'FO_LF')])
    ),
  ];
  const trend = buildBattingTrend(games, 'all', { teamId: 't' });
  expect(trend.map((point) => point.rates?.battingAvg)).toEqual([0.5, 0.2]);
});

test('keeps slugging and OPS above 1.000 for a home-run-only batter', () => {
  const trend = buildBattingTrend(
    [game('g1', '2026-04-01', side('t', [ab('p', 'HR')]))],
    'all',
    { teamId: 't', playerId: 'p' }
  );
  expect(rates(trend[0])).toEqual({ battingAvg: 1, obp: 1, slg: 4, ops: 5 });
});

test('keeps the existing zero-denominator rules for walk-only batters', () => {
  const trend = buildBattingTrend(
    [game('g1', '2026-04-01', side('t', [ab('p', 'BB'), ab('p', 'HBP')]))],
    'all',
    { teamId: 't', playerId: 'p' }
  );
  expect(rates(trend[0])).toEqual({ battingAvg: 0, obp: 1, slg: 0, ops: 1 });
});

test('excludes sacrifices from at-bats and counts sacrifice flies for OBP only', () => {
  const trend = buildBattingTrend(
    [
      game(
        'g1',
        '2026-04-01',
        side('t', [ab('p', 'LH'), ab('p', 'SF'), ab('p', 'SAC')])
      ),
    ],
    'all',
    { teamId: 't', playerId: 'p' }
  );
  expect(rates(trend[0])).toEqual({
    battingAvg: 1,
    obp: 0.5,
    slg: 1,
    ops: 1.5,
  });
});

test('leaves points before the first plate appearance missing and holds values after it', () => {
  const games = [
    game('g1', '2026-04-01', side('t', [ab('other', 'HR')])),
    game('g2', '2026-04-02', side('t', [ab('p', '2B'), ab('p', 'SO')])),
    game('g3', '2026-04-03', side('t', [ab('other', 'SO')])),
  ];
  const trend = buildBattingTrend(games, 'all', {
    teamId: 't',
    playerId: 'p',
  });
  expect(trend.map((point) => point.game.id)).toEqual(['g1', 'g2', 'g3']);
  expect(trend[0].rates).toBeNull();
  expect(rates(trend[1])).toEqual({
    battingAvg: 0.5,
    obp: 0.5,
    slg: 1,
    ops: 1.5,
  });
  expect(trend[2].rates).toEqual(trend[1].rates);
});

test('returns no points for zero games and all-missing points without plate appearances', () => {
  expect(buildBattingTrend([], 'all', { teamId: 't' })).toEqual([]);
  const trend = buildBattingTrend(
    [game('g1', '2026-04-01', side('t'))],
    'all',
    { teamId: 't', playerId: 'reserve' }
  );
  expect(trend).toHaveLength(1);
  expect(trend[0].rates).toBeNull();
});

test('orders by date then game ID regardless of input order and labels same-day games', () => {
  const games = [
    game('b', '2026-05-02', side('t', [ab('p', 'IH')]), side('x', [], 'B校')),
    game('z', '2026-05-01', side('t', [ab('p', 'SO')]), side('x', [], 'Z校')),
    game('a', '2026-05-02', side('x', [], 'A校'), side('t', [ab('p', 'SO')])),
  ];
  const expected = [
    { id: 'z', date: '2026-05-01', label: '2026-05-01', opponentName: 'Z校' },
    {
      id: 'a',
      date: '2026-05-02',
      label: '2026-05-02 (1)',
      opponentName: 'A校',
    },
    {
      id: 'b',
      date: '2026-05-02',
      label: '2026-05-02 (2)',
      opponentName: 'B校',
    },
  ];
  for (const order of [
    games,
    [...games].reverse(),
    [games[1], games[0], games[2]],
  ]) {
    const trend = buildBattingTrend(order, 'all', { teamId: 't' });
    expect(trend.map((point) => point.game)).toEqual(expected);
  }
  expect(
    buildBattingTrend(games, 'all', { teamId: 't' }).map(
      (point) => point.rates?.battingAvg
    )
  ).toEqual([0, 0, 1 / 3]);
});

test('does not mutate the input games or their order', () => {
  const games = [
    game('g2', '2026-04-02', side('t', [ab('p', 'HR')])),
    game('g1', '2026-04-01', side('t', [ab('p', 'SO')])),
  ];
  const snapshot = JSON.stringify(games);
  buildBattingTrend(games, 'all', { teamId: 't', playerId: 'p' });
  expect(JSON.stringify(games)).toBe(snapshot);
});

test.each(['', '2026/04/01', '2026-02-30', '2026-4-1', undefined])(
  'aborts with the game ID when a target game has an unusable date (%p)',
  (date) => {
    const games = [
      game('ok', '2026-04-01', side('t')),
      game('broken', date as unknown as string, side('t')),
    ];
    expect(() => buildBattingTrend(games, 'all', { teamId: 't' })).toThrow(
      /試合日付.*broken/
    );
  }
);

test('ignores unusable dates outside the target team or game type', () => {
  const games = [
    game('ok', '2026-04-01', side('t', [ab('p', 'IH')])),
    game('other-team', '', side('u')),
    game('other-type', '', side('t'), undefined, { gameType: 'practice' }),
  ];
  expect(
    buildBattingTrend(games, 'official', { teamId: 't' }).map(
      (point) => point.game.id
    )
  ).toEqual(['ok']);
});

test('uses the game type filter, including the legacy tournament fallback', () => {
  const games = [
    game('official', '2026-04-01', side('t'), undefined, {
      gameType: undefined,
      tournament: '市民大会',
    }),
    game('practice', '2026-04-02', side('t'), undefined, {
      gameType: undefined,
    }),
    game('junior', '2026-04-03', side('t'), undefined, { gameType: 'junior' }),
  ];
  const ids = (filter: Parameters<typeof buildBattingTrend>[1]) =>
    buildBattingTrend(games, filter, { teamId: 't' }).map((p) => p.game.id);
  expect(ids('official')).toEqual(['official']);
  expect(ids('practice')).toEqual(['practice']);
  expect(ids('junior')).toEqual(['junior']);
  expect(ids('all')).toEqual(['official', 'practice', 'junior']);
});

test('matches players by team ID and player ID only', () => {
  const games = [
    game(
      'g1',
      '2026-04-01',
      side('t', [ab('p', 'HR'), ab('same-name', 'SO'), ab('orphan', 'IH')]),
      side('u', [ab('p', 'SO'), ab('p', 'SO')])
    ),
  ];
  const final = (teamId: string, playerId: string) =>
    buildBattingTrend(games, 'all', { teamId, playerId })[0].rates?.battingAvg;
  expect(final('t', 'p')).toBe(1);
  expect(final('u', 'p')).toBe(0);
  expect(final('t', 'same-name')).toBe(0);
  expect(final('t', 'orphan')).toBe(1);
  expect(
    buildBattingTrend(games, 'all', { teamId: 't' })[0].rates?.battingAvg
  ).toBe(2 / 3);
});

test.each(['all', 'official', 'practice', 'junior'] as const)(
  '%s: the last point equals the stats table built from the same games',
  (filter) => {
    const roster = [
      {
        id: 'p1',
        name: '同名',
        number: '1',
        position: '',
        isActive: true,
        order: 1,
      },
      {
        id: 'p2',
        name: '同名',
        number: '1',
        position: '',
        isActive: true,
        order: 2,
      },
    ];
    const team = (atBats: AtBat[]): Team => ({
      ...side('t', atBats),
      players: roster,
    });
    const games: Game[] = [
      game(
        'g1',
        '2026-04-01',
        team([ab('p1', 'IH'), ab('p1', 'SO'), ab('p2', 'BB')])
      ),
      game(
        'g2',
        '2026-04-01',
        side('x'),
        team([ab('p1', '3B'), ab('p2', 'SF')]),
        {
          gameType: 'practice',
        }
      ),
      game(
        'g3',
        '2026-04-05',
        team([ab('p1', 'HR'), ab('gone', 'GO_P')]),
        undefined,
        {
          gameType: undefined,
          tournament: '',
        }
      ),
      game(
        'g4',
        '2026-04-09',
        team([ab('p2', '2B'), ab('p1', 'SAC')]),
        undefined,
        {
          gameType: 'junior',
        }
      ),
    ];
    const [table] = aggregateTeamStats(games, ['t'], filter);
    const pick = (stats: typeof table.battingStats) => ({
      battingAvg: stats.battingAvg,
      obp: stats.obp,
      slg: stats.slg,
      ops: stats.ops,
    });
    const teamTrend = buildBattingTrend(games, filter, { teamId: 't' });
    expect(teamTrend[teamTrend.length - 1].rates).toEqual(
      pick(table.battingStats)
    );
    for (const player of table.playerStats) {
      const trend = buildBattingTrend(games, filter, {
        teamId: 't',
        playerId: player.playerId,
      });
      const last = trend[trend.length - 1].rates;
      expect(last).toEqual(player.plateAppearances ? pick(player) : null);
    }
  }
);
