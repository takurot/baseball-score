import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreBoard from '../ScoreBoard';
import { Team } from '../../types';

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
    renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={3}
        runEvents={[]}
      />
    );

    // ヘッダーセルがth要素であること
    const teamHeader = screen.getByText('チーム');
    expect(teamHeader.tagName).toBe('TH');

    // スコープ属性が設定されていること
    const allHeaders = screen.getAllByRole('columnheader');
    expect(allHeaders.length).toBeGreaterThan(0);
  });

  test('team names are row headers', () => {
    renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={1}
        runEvents={[]}
      />
    );

    // チーム名がrowheaderロールを持つこと
    const teamAHeader = screen.getByRole('rowheader', { name: /チームA/i });
    const teamBHeader = screen.getByRole('rowheader', { name: /チームB/i });

    expect(teamAHeader).toBeInTheDocument();
    expect(teamBHeader).toBeInTheDocument();
  });

  test('current inning has aria-current attribute', () => {
    const { container } = renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={3}
        runEvents={[]}
      />
    );

    // 現在のイニングにaria-current属性があること
    const currentInningCells = container.querySelectorAll(
      '[aria-current="true"]'
    );
    // ヘッダー1つ + データセル2つ（先攻・後攻）= 3つ
    expect(currentInningCells.length).toBe(3);
  });

  test('total score column has descriptive label', () => {
    renderWithTheme(
      <ScoreBoard
        homeTeam={mockTeamA}
        awayTeam={mockTeamB}
        currentInning={1}
        runEvents={[]}
      />
    );

    // 合計得点列にaria-labelがあること
    const totalHeader = screen.getByRole('columnheader', { name: /合計得点/i });
    expect(totalHeader).toBeInTheDocument();
    expect(totalHeader).toHaveAttribute('title', '合計得点');
  });
});
