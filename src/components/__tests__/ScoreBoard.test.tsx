import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreBoard from '../ScoreBoard';
import { Team } from '../../types';

const theme = createTheme();

const createMockTeam = (name: string): Team => ({
  id: `team-${name}`,
  name,
  players: [],
  atBats: [],
});

describe('ScoreBoard', () => {
  it('チーム名が設定されている場合、スコアボードにチーム名が表示される', () => {
    const awayTeam = createMockTeam('豊郷中央');
    const homeTeam = createMockTeam('ライオンズ');

    render(
      <ThemeProvider theme={theme}>
        <ScoreBoard awayTeam={awayTeam} homeTeam={homeTeam} currentInning={1} />
      </ThemeProvider>
    );

    expect(screen.getByText('豊郷中央')).toBeInTheDocument();
    expect(screen.getByText('ライオンズ')).toBeInTheDocument();
  });

  it('チーム名が空または空白の場合、「先攻」「後攻」とフォールバック表示される', () => {
    const awayTeam = createMockTeam('');
    const homeTeam = createMockTeam('   ');

    render(
      <ThemeProvider theme={theme}>
        <ScoreBoard awayTeam={awayTeam} homeTeam={homeTeam} currentInning={1} />
      </ThemeProvider>
    );

    expect(screen.getByText('先攻')).toBeInTheDocument();
    expect(screen.getByText('後攻')).toBeInTheDocument();
  });
});
