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
});
