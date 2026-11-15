import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { axe } from '../../test/axe';
import TeamStatsList from '../TeamStatsList';
import { getTeamStatsSnapshot, TeamStats } from '../../firebase/statsService';
jest.mock('../TeamStatsPdfExport', () => () => null);

jest.mock('../../firebase/statsService', () => ({
  getTeamStatsSnapshot: jest.fn(),
}));

const mockedGetTeamStatsSnapshot = getTeamStatsSnapshot as jest.MockedFunction<
  typeof getTeamStatsSnapshot
>;
const resolveStats = (teamStats: TeamStats[]) =>
  mockedGetTeamStatsSnapshot.mockResolvedValue({ games: [], teamStats });

const mockTeamStats: TeamStats = {
  teamId: 'team-1',
  teamName: 'テストチーム',
  gameCount: 3,
  wins: 2,
  losses: 1,
  draws: 0,
  totalRuns: 10,
  totalRunsAllowed: 5,
  battingStats: {
    atBats: 20,
    hits: 6,
    singles: 4,
    doubles: 1,
    triples: 0,
    homeRuns: 1,
    walks: 2,
    sacrificeFlies: 0,
    strikeouts: 3,
    rbis: 5,
    battingAvg: 0.3,
    obp: 0.364,
    slg: 0.5,
    ops: 0.864,
  },
  playerStats: [],
};

describe('TeamStatsList accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('has no axe violations with populated stats and toggle buttons', async () => {
    resolveStats([mockTeamStats]);

    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    await screen.findByText('テストチーム');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 15000);

  test('has no axe violations in empty state', async () => {
    resolveStats([]);

    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    await screen.findByText('登録チームに紐付いた該当区分の試合はありません。');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 15000);
});
