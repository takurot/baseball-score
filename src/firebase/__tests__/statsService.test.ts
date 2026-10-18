import { getDocs } from 'firebase/firestore';
import { getCurrentUser } from '../authService';
import { getAllTeamStats } from '../statsService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
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
      gameType?: 'official' | 'practice',
      tournament?: string,
      hits = 1
    ) => ({
      id,
      data: () => ({
        date: '2026-08-22',
        currentInning: 1,
        gameType,
        tournament,
        runEvents: [],
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
        createDummyGame('g4', undefined, '', 5), // レガシー 練習試合 (5安打)
      ],
    });

    // 1. 全試合 ('all' または デフォルト)
    const allStats = await getAllTeamStats();
    const teamAAll = allStats.find((t) => t.teamId === 'team-a');
    expect(teamAAll?.gameCount).toBe(4);
    expect(teamAAll?.battingStats.hits).toBe(14); // 2 + 3 + 4 + 5

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
