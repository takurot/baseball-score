import React from 'react';
import { render } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreBoard from '../ScoreBoard';
import { Team } from '../../types';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('ScoreBoard accessibility', () => {
  test('has no axe violations', async () => {
    const team: Team = { id: 't1', name: 'A', players: [], atBats: [] };
    const { container } = renderWithTheme(
      <ScoreBoard
        homeTeam={team}
        awayTeam={team}
        currentInning={1}
        runEvents={[]}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
