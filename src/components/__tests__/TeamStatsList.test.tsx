import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamStatsList from '../TeamStatsList';
import { getAllTeamStats, TeamStats } from '../../firebase/statsService';

jest.mock('../../firebase/statsService', () => ({
  getAllTeamStats: jest.fn(),
  MIN_QUALIFYING_AT_BATS: 10,
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

  test('Error インスタンスでない例外でも意味のあるメッセージを表示する', async () => {
    mockedGetAllTeamStats.mockRejectedValue('network down');

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('成績の取得に失敗しました');
    expect(alert).not.toHaveTextContent('undefined');
  });

  test('選手一覧で規定打数以上の選手にツールチップの数値が反映される', async () => {
    const teamWithPlayers: TeamStats = {
      ...allWins,
      playerStats: [
        {
          playerId: 'p1',
          playerName: '選手1',
          playerNumber: '1',
          playerPosition: 'CF',
          gameCount: 1,
          atBats: 12,
          hits: 4,
          singles: 4,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          walks: 0,
          sacrificeFlies: 0,
          strikeouts: 0,
          rbis: 0,
          battingAvg: 0.333,
          obp: 0.333,
          slg: 0.333,
          ops: 0.666,
        },
      ],
    };
    mockedGetAllTeamStats.mockResolvedValue([teamWithPlayers]);

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    const user = userEvent.setup();
    await screen.findByText('全勝チーム');
    await user.click(screen.getByRole('tab', { name: '個人成績' }));

    expect(
      await screen.findByLabelText(
        '規定打数（10打数以上）に到達した選手を上位表示しています。'
      )
    ).toBeInTheDocument();
  }, 15000);
});
