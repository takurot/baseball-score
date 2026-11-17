const mockLogEvent = jest.fn();
const mockInitializeAnalytics = jest.fn();
const mockGetAnalytics = jest.fn();

jest.mock('../config', () => ({ app: { name: 'app' } }));
jest.mock('firebase/analytics', () => ({
  isSupported: async () => true,
  initializeAnalytics: (...args: unknown[]) => mockInitializeAnalytics(...args),
  getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

// The client caches the Analytics instance in module state, so load it fresh per test.
const loadClient = () => {
  let client: typeof import('../analyticsClient');
  jest.isolateModules(() => {
    client = require('../analyticsClient');
  });
  return client!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInitializeAnalytics.mockReturnValue({ name: 'analytics' });
  mockGetAnalytics.mockReturnValue({ name: 'analytics-existing' });
  window.history.pushState({}, '', '/');
});

const sentParams = () => mockLogEvent.mock.calls[0][2];

describe('analytics initialization', () => {
  it('reports the page without its query string, referrer or automatic page_view', async () => {
    window.history.pushState({}, '', '/?gameId=SECRET-SHARE-ID&view=game');
    await loadClient().logAnalyticsEvent('help_view', { screen: 'main' });

    expect(mockInitializeAnalytics).toHaveBeenCalledTimes(1);
    const [, options] = mockInitializeAnalytics.mock.calls[0];
    // a shared link's gameId would otherwise reach GA4 in page_location on every event
    expect(options.config.page_location).toBe(
      `${window.location.origin}${window.location.pathname}`
    );
    expect(options.config.page_location).not.toContain('SECRET-SHARE-ID');
    expect(options.config.page_referrer).toBe('');
    expect(options.config.send_page_view).toBe(false);
  });

  it('falls back to the existing instance when analytics was already initialized', async () => {
    mockInitializeAnalytics.mockImplementation(() => {
      throw new Error('already initialized');
    });
    await loadClient().logAnalyticsEvent('help_view', { screen: 'main' });

    expect(mockGetAnalytics).toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith(
      { name: 'analytics-existing' },
      'help_view',
      { screen: 'main' }
    );
  });
});

describe('logAnalyticsEvent parameters', () => {
  it('sends only the known, non-identifying parameters', async () => {
    await loadClient().logAnalyticsEvent('add_run_event', {
      run_type: '盗塁',
      run_count: 1,
      inning: 3,
      mode: 'edit',
      screen: 'main',
      page_title: 'Home',
      out_type: '牽制アウト',
    });
    expect(sentParams()).toEqual({
      run_type: '盗塁',
      run_count: 1,
      inning: 3,
      mode: 'edit',
      screen: 'main',
      page_title: 'Home',
      out_type: '牽制アウト',
    });
  });

  it('drops everything else: team names, titles, notes, nested data, free-text labels and game IDs', async () => {
    await loadClient().logAnalyticsEvent('game_load', {
      gameId: 'ABC',
      teams: '○○小学校 vs △△クラブ',
      gameTitle: '○○小学校 vs △△クラブ',
      homeTeam: { name: '○○小学校' },
      awayTeam: '△△クラブ',
      name: '山田',
      note: '監督のメモ',
      label: '○○小 vs △△',
      email: 'someone@example.com',
      nested: { game: { homeTeam: '○○小学校' } },
      inning: 2,
    });
    expect(sentParams()).toEqual({ inning: 2 });
  });

  it('sends an event without parameters as is', async () => {
    await loadClient().logAnalyticsEvent('shared_game_view');
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.anything(),
      'shared_game_view',
      undefined
    );
  });
});
