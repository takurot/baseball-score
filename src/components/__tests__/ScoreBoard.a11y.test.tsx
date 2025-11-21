import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreBoard from '../ScoreBoard';
import { RunEvent, Team } from '../../types';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('ScoreBoard accessibility', () => {
  const mockTeamA: Team = {
    id: 't1',
    name: 'チームA',
    players: [],
    atBats: [],
  };

  const mockTeamB: Team = {
    id: 't2',
    name: 'チームB',
    players: [],
    atBats: [],
  };

  const renderScoreBoard = (
    props?: Partial<React.ComponentProps<typeof ScoreBoard>>
  ) =>
    renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={1}
        runEvents={[]}
        {...props}
      />
    );

  test('has no axe violations', async () => {
    const { container } = renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={1}
        runEvents={[]}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('table headers have proper semantic markup', () => {
    renderScoreBoard({ currentInning: 3 });

    // ヘッダーセルがth要素であること
    const teamHeader = screen.getByText('チーム');
    expect(teamHeader.tagName).toBe('TH');

    // スコープ属性が設定されていること
    const allHeaders = screen.getAllByRole('columnheader');
    expect(allHeaders.length).toBeGreaterThan(0);
  });

  test('team names are row headers', () => {
    renderScoreBoard();

    // チーム名がrowheaderロールを持つこと
    const teamAHeader = screen.getByRole('rowheader', { name: /チームA/i });
    const teamBHeader = screen.getByRole('rowheader', { name: /チームB/i });

    expect(teamAHeader).toBeInTheDocument();
    expect(teamBHeader).toBeInTheDocument();
  });

  test('current inning has aria-current attribute', () => {
    const { container } = renderScoreBoard({ currentInning: 3 });

    // 現在のイニングにaria-current属性があること
    const currentInningCells = container.querySelectorAll(
      '[aria-current="true"]'
    );
    // ヘッダー1つ + データセル2つ（先攻・後攻）= 3つ
    expect(currentInningCells.length).toBe(3);
  });

  test('total score column has descriptive label', () => {
    renderScoreBoard();

    // 合計得点列にaria-labelがあること
    const totalHeader = screen.getByRole('columnheader', { name: /合計得点/i });
    expect(totalHeader).toBeInTheDocument();
    expect(totalHeader).toHaveAttribute('title', '合計得点');
  });

  test('renders scoreboard heading and team summaries with R/H/E values', () => {
    renderScoreBoard();

    expect(screen.getByText('スコアボード')).toBeInTheDocument();
    const awaySummary = screen.getByTestId('scoreboard-summary-away');
    const homeSummary = screen.getByTestId('scoreboard-summary-home');

    expect(awaySummary).toHaveTextContent(/チームB/);
    expect(awaySummary).toHaveTextContent(/R 0 \/ H 0 \/ E 0/);
    expect(homeSummary).toHaveTextContent(/チームA/);
    expect(homeSummary).toHaveTextContent(/R 0 \/ H 0 \/ E 0/);
  });

  test('summary values reflect hits, errors, and run events', () => {
    const scoringHomeTeam: Team = {
      ...mockTeamA,
      atBats: [
        {
          id: 'ab-1',
          playerId: 'p1',
          result: 'IH',
          inning: 1,
          rbi: 1,
          isOut: false,
          isTop: false,
        },
        {
          id: 'ab-2',
          playerId: 'p2',
          result: 'E',
          inning: 2,
          rbi: 0,
          isOut: false,
          isTop: false,
        },
      ],
    };

    const scoringRunEvents: RunEvent[] = [
      {
        id: 'run-1',
        inning: 2,
        isTop: false,
        runType: 'その他',
        runCount: 2,
        timestamp: Date.now(),
      },
    ];

    renderScoreBoard({
      homeTeam: scoringHomeTeam,
      runEvents: scoringRunEvents,
      currentInning: 2,
    });

    const homeSummary = screen.getByTestId('scoreboard-summary-home');

    expect(homeSummary).toHaveTextContent(/R 3 \/ H 1 \/ E 1/);
  });
});
