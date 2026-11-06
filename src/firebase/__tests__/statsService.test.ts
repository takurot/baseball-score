import { getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { getCurrentUser } from '../authService';
import { getAllTeamStats } from '../statsService';
import { getUserTeams } from '../teamService';
import { Game, Team, TeamSetting } from '../../types';
import { linkTeamRoster } from '../../services/TeamRoster';
import { saveGame } from '../gameService';

jest.mock('../teamService', () => ({ getUserTeams: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

jest.mock('../config', () => ({ db: {} }));
jest.mock('../authService', () => ({ getCurrentUser: jest.fn() }));

const mockedGetDocs = getDocs as jest.Mock;
const mockedGetCurrentUser = getCurrentUser as jest.Mock;

describe('getAllTeamStats', () => {
  beforeEach(() => {
    (getUserTeams as jest.Mock).mockResolvedValue(
      ['home', 'away', 'team-a', 'team-b'].map((id) => ({ id }))
    );
  });
  test('公式戦は四球を含む1打席以上を優先、他区分は10打数以上を優先する', async () => {
    mockedGetCurrentUser.mockReturnValue({ uid: 'user-1' });
    const players = [
      { id: 'zero', name: 'ゼロ', number: '0', position: '', isActive: true },
      { id: 'low', name: '少ない', number: '1', position: '', isActive: true },
      { id: 'high', name: '多い', number: '2', position: '', isActive: true },
    ];
    mockedGetDocs.mockResolvedValue({
      docs: ['official', 'practice', 'junior'].map((gameType) => ({
        id: gameType,
        data: () => ({
          gameType,
          homeTeam: {
            id: 'home',
            name: 'ホーム',
            players,
            atBats: [
              {
                id: `${gameType}-low`,
                playerId: 'low',
                result: 'BB',
                inning: 1,
                rbi: 0,
                isOut: false,
                isTop: false,
              },
              ...Array.from({ length: 10 }, (_, i) => ({
                id: `${gameType}-${i}`,
                playerId: 'high',
                result: 'IH',
                inning: 1,
                rbi: 0,
                isOut: false,
                isTop: false,
              })),
            ],
          },
          awayTeam: { id: '', name: '相手', players: [], atBats: [] },
          runEvents: [],
        }),
      })),
    });
    for (const filter of ['official', 'practice', 'junior', 'all'] as const) {
      const stats = await getAllTeamStats(filter);
      const ids = stats[0].playerStats.map((p) => p.playerId);
      expect(ids).toEqual(
        filter === 'official'
          ? ['low', 'high', 'zero']
          : ['high', 'zero', 'low']
      );
    }
  });

  test('正式な式でチームと選手の出塁率を集計する', async () => {
    mockedGetCurrentUser.mockReturnValue({ uid: 'user-1' });
    mockedGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'game-1',
          data: () => ({
            date: '2026-08-22',
            currentInning: 1,
            runEvents: [],
            homeTeam: {
              id: 'home',
              name: 'ホーム',
              players: [
                {
                  id: 'player-1',
                  name: '打者',
                  number: '1',
                  position: '投手',
                  isActive: true,
                  order: 1,
                },
              ],
              atBats: [
                {
                  id: 'ab-1',
                  playerId: 'player-1',
                  result: 'HR',
                  inning: 1,
                  rbi: 1,
                  isOut: false,
                  isTop: false,
                },
                {
                  id: 'ab-2',
                  playerId: 'player-1',
                  result: 'SAC',
                  inning: 1,
                  rbi: 0,
                  isOut: true,
                  isTop: false,
                },
              ],
            },
            awayTeam: {
              id: 'away',
              name: 'アウェイ',
              players: [],
              atBats: [],
            },
          }),
        },
      ],
    });

    const stats = await getAllTeamStats();
    const homeStats = stats.find((team) => team.teamId === 'home');

    expect(homeStats?.battingStats.obp).toBe(1);
    expect(homeStats?.playerStats[0].obp).toBe(1);
  });

  test('filters games by gameType correctly including fallback for legacy games', async () => {
    mockedGetCurrentUser.mockReturnValue({ uid: 'user-1' });

    const createDummyGame = (
      id: string,
      gameType?: 'official' | 'practice' | 'junior',
      tournament?: string,
      hits = 1
    ) => ({
      id,
      data: () => ({
        date: '2026-08-22',
        currentInning: 1,
        gameType,
        tournament,
        runEvents:
          gameType === 'junior'
            ? [
                { id: 'r1', inning: 1, isTop: false, runCount: 3 },
                { id: 'r2', inning: 1, isTop: true, runCount: 1 },
              ]
            : [],
        homeTeam: {
          id: 'team-a',
          name: 'チームA',
          players: [
            {
              id: 'p-1',
              name: '選手1',
              number: '1',
              position: '投',
              isActive: true,
              order: 1,
            },
          ],
          atBats: Array.from({ length: hits }, (_, i) => ({
            id: `ab-${id}-${i}`,
            playerId: 'p-1',
            result: 'IH',
            inning: 1,
            rbi: 0,
            isOut: false,
            isTop: false,
          })),
        },
        awayTeam: {
          id: 'team-b',
          name: 'チームB',
          players: [],
          atBats: [],
        },
      }),
    });

    mockedGetDocs.mockResolvedValue({
      docs: [
        createDummyGame('g1', 'official', undefined, 2), // 明示的 公式戦 (2安打)
        createDummyGame('g2', undefined, '市民大会', 3), // レガシー 公式戦 (3安打)
        createDummyGame('g3', 'practice', undefined, 4), // 明示的 練習試合 (4安打)
        createDummyGame('g5', 'junior', 'ジュニア大会', 6),
        createDummyGame('g4', undefined, '', 5), // レガシー 練習試合 (5安打)
      ],
    });

    // 1. 全試合 ('all' または デフォルト)
    const allStats = await getAllTeamStats();
    const teamAAll = allStats.find((t) => t.teamId === 'team-a');
    expect(teamAAll?.gameCount).toBe(5);
    expect(teamAAll?.battingStats.hits).toBe(20); // 2 + 3 + 4 + 5 + 6

    const juniorStats = await getAllTeamStats('junior');
    const junior = juniorStats.find((t) => t.teamId === 'team-a');
    expect(junior?.gameCount).toBe(1);
    expect(junior?.wins).toBe(1);
    expect(junior?.totalRuns).toBe(3);
    expect(junior?.totalRunsAllowed).toBe(1);
    expect(junior?.playerStats[0].gameCount).toBe(1);
    expect(junior?.battingStats.hits).toBe(6);
    expect(junior?.playerStats[0].hits).toBe(6);

    // 2. 公式戦のみ ('official')
    const officialStats = await getAllTeamStats('official');
    const teamAOfficial = officialStats.find((t) => t.teamId === 'team-a');
    expect(teamAOfficial?.gameCount).toBe(2);
    expect(teamAOfficial?.battingStats.hits).toBe(5); // 2 + 3

    // 3. 練習試合のみ ('practice')
    const practiceStats = await getAllTeamStats('practice');
    const teamAPractice = practiceStats.find((t) => t.teamId === 'team-a');
    expect(teamAPractice?.gameCount).toBe(2);
    expect(teamAPractice?.battingStats.hits).toBe(9); // 4 + 5
  });
});

describe('registered team boundaries', () => {
  const team = (id: string): Team => ({
    id,
    name: '同じ名前',
    players: [],
    atBats: [],
  });
  test.each(['all', 'official', 'practice'] as const)(
    '%s: only registered sides count, with all opponent runs retained',
    async (filter) => {
      mockedGetCurrentUser.mockReturnValue({ uid: 'user-1' });
      (getUserTeams as jest.Mock).mockResolvedValue([
        { id: 'registered' },
        { id: 'other' },
      ]);
      const games: Game[] = [];
      for (const gameType of ['official', 'practice'] as const) {
        for (const [home, away] of [
          ['', ''],
          ['random-uuid', ''],
          ['registered', ''],
          ['random-uuid', 'registered'],
          ['registered', 'other'],
        ]) {
          games.push({
            id: `${gameType}-${games.length}`,
            date: '2026-10-28',
            gameType,
            currentInning: 1,
            homeTeam: team(home),
            awayTeam: team(away),
            runEvents: [
              {
                id: 'r1',
                inning: 1,
                isTop: false,
                runType: 'その他',
                runCount: 3,
                timestamp: 0,
              },
              {
                id: 'r2',
                inning: 1,
                isTop: true,
                runType: 'その他',
                runCount: 1,
                timestamp: 0,
              },
            ],
          });
        }
      }
      mockedGetDocs.mockResolvedValue({
        docs: games.map((game) => ({ id: game.id, data: () => game })),
      });
      const result = await getAllTeamStats(filter);
      const multiplier = filter === 'all' ? 2 : 1;
      expect(result.map((s) => s.teamId).sort()).toEqual([
        'other',
        'registered',
      ]);
      expect(result.find((s) => s.teamId === 'registered')).toMatchObject({
        gameCount: 3 * multiplier,
        wins: 2 * multiplier,
        losses: multiplier,
        totalRuns: 7 * multiplier,
        totalRunsAllowed: 5 * multiplier,
      });
      expect(result.find((s) => s.teamId === 'other')?.gameCount).toBe(
        multiplier
      );
    }
  );

  test('no registrations means no aggregate rows', async () => {
    mockedGetCurrentUser.mockReturnValue({ uid: 'user-1' });
    mockedGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'g',
          data: () => ({ homeTeam: team(''), awayTeam: team('uuid') }),
        },
      ],
    });
    (getUserTeams as jest.Mock).mockResolvedValue([]);
    expect(await getAllTeamStats()).toEqual([]);
  });
});

describe('player identity and saved-game repair', () => {
  test.each(['all', 'official', 'practice'] as const)(
    '%s: explicit repair survives save/reload without changing team outcomes',
    async (filter) => {
      const player = (id: string) => ({
        id,
        name: '同名',
        number: '1',
        position: 'P',
        isActive: false,
        order: 0,
      });
      const registered: TeamSetting = {
        id: 'registered',
        name: '登録',
        userId: 'user-1',
        players: [player('canonical')],
      };
      mockedGetCurrentUser.mockReturnValue({
        uid: 'user-1',
        email: 'me@example.com',
      });
      (getUserTeams as jest.Mock).mockResolvedValue([registered]);
      const stored = new Map<string, Game>();
      for (const gameType of ['official', 'practice'] as const) {
        for (const id of ['canonical', 'old']) {
          const homeTeam: Team = {
            id: 'registered',
            name: '登録',
            players: [player(id), player(id), player('separate')],
            atBats: [
              {
                id: `${gameType}-${id}`,
                playerId: id,
                inning: 1,
                isTop: false,
                result: 'HR',
                rbi: 2,
                isOut: false,
              },
              {
                id: `${gameType}-${id}-orphan`,
                playerId: 'removed',
                inning: 1,
                isTop: false,
                result: 'BB',
                rbi: 0,
                isOut: false,
              },
            ],
          };
          const game: Game = {
            id: `${gameType}-${id}`,
            userId: 'user-1',
            date: '2026-10-28',
            gameType,
            homeTeam,
            awayTeam: { id: '', name: '相手', players: [], atBats: [] },
            currentInning: 1,
            runEvents: [
              {
                id: 'run',
                inning: 1,
                isTop: true,
                runType: 'その他',
                runCount: 1,
                timestamp: 123,
              },
            ],
            outEvents: [
              {
                id: 'out',
                inning: 1,
                isTop: true,
                outType: '牽制アウト',
                timestamp: 123,
              },
            ],
          };
          stored.set(game.id, game);
        }
      }
      mockedGetDocs.mockImplementation(async () => ({
        docs: Array.from(stored.values()).map((game) => ({
          id: game.id,
          data: () => game,
        })),
      }));
      const before = (await getAllTeamStats(filter))[0];
      const count = filter === 'all' ? 4 : 2;
      expect(
        before.playerStats.find((p) => p.playerId === 'canonical')
      ).toMatchObject({ gameCount: count / 2, hits: count / 2 });
      expect(
        before.playerStats.find((p) => p.playerId === 'separate')
      ).toMatchObject({ gameCount: count, atBats: 0 });
      expect(
        before.playerStats.find((p) => p.playerId === 'removed')?.walks
      ).toBe(count);
      // Exercise the real save service with an in-memory Firestore transport.
      (getDoc as jest.Mock).mockImplementation(async () => ({
        exists: () => true,
        data: () => ({ userId: 'user-1' }),
        id: 'existing',
      }));
      for (const [id, game] of Array.from(stored.entries())) {
        const linked = {
          ...game,
          homeTeam: linkTeamRoster(game.homeTeam, registered, {
            old: 'canonical',
          }),
        };
        (updateDoc as jest.Mock).mockImplementation(async (_ref, payload) => {
          stored.set(id, { ...payload, id });
        });
        await saveGame(linked);
        await saveGame(linked);
        expect(stored.get(id)?.homeTeam.atBats).toEqual(
          game.homeTeam.atBats.map((ab) => ({
            ...ab,
            playerId: ab.playerId === 'old' ? 'canonical' : ab.playerId,
          }))
        );
        expect(stored.get(id)?.runEvents).toEqual(game.runEvents);
        expect(stored.get(id)?.outEvents).toEqual(game.outEvents);
      }
      const after = (await getAllTeamStats(filter))[0];
      expect({ ...after, playerStats: [] }).toEqual({
        ...before,
        playerStats: [],
      });
      expect(after.playerStats.map((p) => p.playerId).sort()).toEqual([
        'canonical',
        'removed',
        'separate',
      ]);
      expect(
        after.playerStats.find((p) => p.playerId === 'canonical')
      ).toMatchObject({ hits: count, gameCount: count });
      expect(await getAllTeamStats(filter)).toEqual([after]);
    }
  );
});
