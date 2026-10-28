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

  test('試合区分の切り替え（すべて・公式戦・練習試合）で再集計され、URLと同期する', async () => {
    mockedGetAllTeamStats.mockResolvedValue([allWins]);
    window.history.replaceState({}, '', '/?view=teamStats');

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    const user = userEvent.setup();
    await screen.findByText('全勝チーム');
    expect(mockedGetAllTeamStats).toHaveBeenCalledWith('all');

    // 「公式戦」に切り替え
    const officialButton = screen.getByRole('button', { name: '公式戦' });
    await user.click(officialButton);

    expect(mockedGetAllTeamStats).toHaveBeenCalledWith('official');
    expect(window.location.search).toContain('gameType=official');

    // 「練習試合」に切り替え
    const practiceButton = screen.getByRole('button', { name: '練習試合' });
    await user.click(practiceButton);

    expect(mockedGetAllTeamStats).toHaveBeenCalledWith('practice');
    expect(window.location.search).toContain('gameType=practice');

    // 「すべて（統合）」に切り替え
    const allButton = screen.getByRole('button', { name: 'すべて（統合）' });
    await user.click(allButton);

    expect(mockedGetAllTeamStats).toHaveBeenCalledWith('all');
    expect(window.location.search).not.toContain('gameType=');
  }, 15000);

  test('URLクエリ ?gameType=official で初期表示した場合は公式戦フィルターが適用される', async () => {
    mockedGetAllTeamStats.mockResolvedValue([allWins]);
    window.history.replaceState({}, '', '/?view=teamStats&gameType=official');

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    await screen.findByText('全勝チーム');
    expect(mockedGetAllTeamStats).toHaveBeenCalledWith('official');
  }, 15000);

  test('該当区分の試合が0件の場合に空状態のメッセージを表示する', async () => {
    mockedGetAllTeamStats.mockResolvedValue([]);

    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );

    expect(
      await screen.findByText(
        '登録チームに紐付いた該当区分の試合はありません。'
      )
    ).toBeInTheDocument();
  }, 15000);
});

test.each([false, true])(
  '登録試合数と控えの説明がデスクトップ／モバイルで一致する (mobile=%s)',
  async (mobile) => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: mobile,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    mockedGetAllTeamStats.mockResolvedValue([
      {
        ...allWins,
        playerStats: [
          {
            ...allWins.battingStats,
            playerId: 'reserve',
            playerName: '控え選手',
            playerNumber: '12',
            playerPosition: 'P',
            gameCount: 2,
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );
    await screen.findByText('全勝チーム');
    await user.click(screen.getByRole('tab', { name: '個人成績' }));
    expect(screen.getByText(/打席ゼロの控えも表示します/)).toBeInTheDocument();
    if (mobile) {
      await user.click(screen.getByRole('button', { name: /控え選手/ }));
      expect(screen.getByText('登録試合数: 2')).toBeInTheDocument();
    } else {
      expect(
        screen.getByRole('columnheader', { name: '登録試合数' })
      ).toBeInTheDocument();
      expect(screen.getByText('控え選手')).toBeInTheDocument();
    }
    window.matchMedia = originalMatchMedia;
  }
);
