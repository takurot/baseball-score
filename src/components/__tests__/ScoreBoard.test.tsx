import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScoreBoard from '../ScoreBoard';
import { AtBat, Team } from '../../types';

const theme = createTheme();

const createMockTeam = (name: string): Team => ({
  id: `team-${name}`,
  name,
  players: [],
  atBats: [],
});

describe('ScoreBoard', () => {
  it.each([true, false])(
    '両チームのエラー出塁を相手の失策として表示し、編集・削除に追随する (isTop=%s)',
    (isTop) => {
      const atBat: AtBat = {
        id: 'error-1',
        playerId: 'player-1',
        inning: 1,
        isTop,
        result: 'E',
        rbi: 0,
        isOut: false,
      };
      const battingTeam = { ...createMockTeam('攻撃側'), atBats: [atBat] };
      const opposingTeam = {
        ...createMockTeam('相手側'),
        atBats: [
          { ...atBat, id: 'error-2', isTop: !isTop },
          { ...atBat, id: 'error-3', isTop: !isTop },
        ],
      };
      const board = (team: Team) => (
        <ThemeProvider theme={theme}>
          <ScoreBoard
            awayTeam={isTop ? team : opposingTeam}
            homeTeam={isTop ? opposingTeam : team}
            currentInning={1}
          />
        </ThemeProvider>
      );
      const battingSide = isTop ? 'away' : 'home';
      const fieldingSide = isTop ? 'home' : 'away';
      const { rerender } = render(board(battingTeam));

      expect(
        screen.getByTestId(`scoreboard-e-${fieldingSide}`)
      ).toHaveTextContent('1');
      expect(
        screen.getByTestId(`scoreboard-e-${battingSide}`)
      ).toHaveTextContent('2');
      expect(
        screen.getByTestId(`scoreboard-h-${battingSide}`)
      ).toHaveTextContent('0');
      expect(
        screen.getByTestId(`scoreboard-r-${battingSide}`)
      ).toHaveTextContent('0');

      rerender(board({ ...battingTeam, atBats: [{ ...atBat, result: 'IH' }] }));
      expect(
        screen.getByTestId(`scoreboard-e-${fieldingSide}`)
      ).toHaveTextContent('0');
      expect(
        screen.getByTestId(`scoreboard-h-${battingSide}`)
      ).toHaveTextContent('1');

      rerender(board(battingTeam));
      expect(
        screen.getByTestId(`scoreboard-e-${fieldingSide}`)
      ).toHaveTextContent('1');
      rerender(board({ ...battingTeam, atBats: [] }));
      expect(
        screen.getByTestId(`scoreboard-e-${fieldingSide}`)
      ).toHaveTextContent('0');
      expect(
        screen.getByTestId(`scoreboard-e-${battingSide}`)
      ).toHaveTextContent('2');
    }
  );

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

  it('チーム名が空または空白の場合、「先攻チーム」「後攻チーム」とフォールバック表示される', () => {
    const awayTeam = createMockTeam('');
    const homeTeam = createMockTeam('   ');

    render(
      <ThemeProvider theme={theme}>
        <ScoreBoard awayTeam={awayTeam} homeTeam={homeTeam} currentInning={1} />
      </ThemeProvider>
    );

    expect(screen.getByText('先攻チーム')).toBeInTheDocument();
    expect(screen.getByText('後攻チーム')).toBeInTheDocument();
  });
});
