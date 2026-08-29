import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from '../../test/axe';

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

  test('total score, hit, and error columns have descriptive labels', () => {
    renderScoreBoard();

    const totalHeader = screen.getByRole('columnheader', { name: /合計得点/i });
    expect(totalHeader).toBeInTheDocument();
    expect(totalHeader).toHaveAttribute('title', '合計得点');

    const hitsHeader = screen.getByRole('columnheader', { name: /安打数/i });
    expect(hitsHeader).toBeInTheDocument();
    expect(hitsHeader).toHaveAttribute('title', '安打数');

    const errorsHeader = screen.getByRole('columnheader', { name: /失策数/i });
    expect(errorsHeader).toBeInTheDocument();
    expect(errorsHeader).toHaveAttribute('title', '失策数');
  });

  test('renders scoreboard heading and R/H/E values in table rows', () => {
    renderScoreBoard();

    expect(screen.getByText('スコアボード')).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard-r-away')).toHaveTextContent('0');
    expect(screen.getByTestId('scoreboard-h-away')).toHaveTextContent('0');
    expect(screen.getByTestId('scoreboard-e-away')).toHaveTextContent('0');

    expect(screen.getByTestId('scoreboard-r-home')).toHaveTextContent('0');
    expect(screen.getByTestId('scoreboard-h-home')).toHaveTextContent('0');
    expect(screen.getByTestId('scoreboard-e-home')).toHaveTextContent('0');
  });

  test('R/H/E values reflect hits, errors, and run events', () => {
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

    expect(screen.getByTestId('scoreboard-r-home')).toHaveTextContent('3');
    expect(screen.getByTestId('scoreboard-h-home')).toHaveTextContent('1');
    expect(screen.getByTestId('scoreboard-e-home')).toHaveTextContent('1');
  });

  test('TypographyコンポーネントにfontWeightがsx経由で正しく適用されReactのDOM警告が出ない', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderScoreBoard();

    const heading = screen.getByText('スコアボード');
    expect(heading).toBeInTheDocument();
    expect(getComputedStyle(heading).fontWeight).toBe('600');

    const domWarnings = errorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          arg.includes(
            'React does not recognize the `fontWeight` prop on a DOM element'
          )
      )
    );
    expect(domWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
