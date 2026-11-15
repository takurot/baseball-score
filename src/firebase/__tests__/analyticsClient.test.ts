import { logAnalyticsEvent } from '../analyticsClient';

const mockLogEvent = jest.fn();

jest.mock('../config', () => ({ app: {} }));
jest.mock('firebase/analytics', () => ({
  isSupported: jest.fn(async () => true),
  getAnalytics: jest.fn(() => ({ name: 'analytics' })),
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

describe('logAnalyticsEvent', () => {
  beforeEach(() => {
    mockLogEvent.mockClear();
  });

  it('sends ordinary parameters unchanged', async () => {
    await logAnalyticsEvent('game_save_new', { gameId: 'g1' });
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.anything(),
      'game_save_new',
      { gameId: 'g1' }
    );
  });

  it('never sends team names, game titles or other personal parameters', async () => {
    await logAnalyticsEvent('game_load', {
      gameId: 'g1',
      teams: '○○小学校 vs △△クラブ',
      gameTitle: '○○小学校 vs △△クラブ',
      teamName: '○○小学校',
      playerName: '山田',
      venue: '市民球場',
      tournament: '春季大会',
      email: 'someone@example.com',
    });
    const sent = mockLogEvent.mock.calls[0][2];
    expect(sent).toEqual({ gameId: 'g1' });
  });

  it('matches the forbidden keys case-insensitively', async () => {
    await logAnalyticsEvent('x', { TeamName: 'a', Email: 'b', gameId: 'g' });
    expect(mockLogEvent.mock.calls[0][2]).toEqual({ gameId: 'g' });
  });

  it('sends an event without parameters as is', async () => {
    await logAnalyticsEvent('shared_game_view');
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.anything(),
      'shared_game_view',
      undefined
    );
  });
});
