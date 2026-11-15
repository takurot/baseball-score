import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('TeamStatsList - 表の名前と行見出し', () => {
  const withPlayer: TeamStats = {
    ...mockTeamStats,
    playerStats: [
      {
        playerId: 'p1',
        playerName: '山田太郎',
        playerNumber: '7',
        playerPosition: '外',
        gameCount: 3,
        plateAppearances: 12,
        atBats: 10,
        hits: 4,
        singles: 3,
        doubles: 1,
        triples: 0,
        homeRuns: 0,
        walks: 2,
        sacrificeFlies: 0,
        strikeouts: 1,
        rbis: 2,
        battingAvg: 0.4,
        obp: 0.5,
        slg: 0.5,
        ops: 1,
      },
    ],
  };

  const open = async (tab?: string) => {
    resolveStats([withPlayer]);
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );
    await screen.findByRole('tab', { name: 'チーム成績' });
    if (tab) await user.click(screen.getByRole('tab', { name: tab }));
    return user;
  };

  test('チーム成績の表に名前が付き、チーム名が行見出しになる', async () => {
    await open();
    expect(
      await screen.findByRole('table', { name: 'チーム成績' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', { name: 'テストチーム' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '試合数' })
    ).toBeInTheDocument();
  }, 30000);

  test('チーム打撃成績の表に名前が付く', async () => {
    await open('打撃成績');
    expect(
      await screen.findByRole('table', { name: 'チーム打撃成績' })
    ).toBeInTheDocument();
  }, 30000);

  test('個人成績の表に名前が付き、選手名が行見出しになる', async () => {
    await open('個人成績');
    expect(
      await screen.findByRole('table', { name: 'テストチームの選手成績' })
    ).toBeInTheDocument();
    // 行見出しの名前は選手名そのもの（中の「推移グラフを開く」ボタンのラベルではない）
    expect(
      screen.getByRole('rowheader', { name: '山田太郎' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '登録試合数' })
    ).toBeInTheDocument();
  }, 30000);

  test('横スクロールする3つの表は、名前の付いた region でキーボード操作できる', async () => {
    await open();
    for (const [tab, name] of [
      [undefined, 'チーム成績'],
      ['打撃成績', 'チーム打撃成績'],
      ['個人成績', 'テストチームの選手成績'],
    ] as const) {
      if (tab) await userEvent.click(screen.getByRole('tab', { name: tab }));
      const table = await screen.findByRole('table', { name });
      const region = screen.getByRole('region', { name });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region).toContainElement(table);
    }
  }, 30000);

  test('名前を付けた後も重大な axe 違反がない', async () => {
    await open('個人成績');
    await screen.findByRole('table', { name: 'テストチームの選手成績' });
    // ページ全体の見出し構造などの既存の指摘とは切り離し、今回の領域（名前付きの表）を検査する
    const region = screen.getByRole('region', {
      name: 'テストチームの選手成績',
    });
    expect(await axe(region)).toHaveNoViolations();
  }, 30000);
});
