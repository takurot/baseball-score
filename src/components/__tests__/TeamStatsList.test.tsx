import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamStatsList from '../TeamStatsList';
import { getAllTeamStats, TeamStats } from '../../firebase/statsService';

jest.mock('../../firebase/statsService', () => ({
  getAllTeamStats: jest.fn(),
}));

const mockedGetAllTeamStats = getAllTeamStats as jest.MockedFunction<
  typeof getAllTeamStats
>;

const allWins: TeamStats = {
  teamId: 'team-1',
  teamName: '全勝チーム',
  gameCount: 2,
  wins: 2,
  losses: 0,
  draws: 0,
  totalRuns: 8,
  totalRunsAllowed: 1,
  battingStats: {
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    rbis: 0,
    battingAvg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
  },
  playerStats: [],
};

describe('TeamStatsList', () => {
  test('全勝チームの勝率を1.000と表示する', async () => {
    mockedGetAllTeamStats.mockResolvedValue([allWins]);

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    expect(await screen.findByText('全勝チーム')).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();
  });
});
