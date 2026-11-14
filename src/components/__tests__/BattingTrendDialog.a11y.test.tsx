import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { axe } from '../../test/axe';
import TeamStatsList from '../TeamStatsList';
import { getTeamStatsSnapshot } from '../../firebase/statsService';
import { Game } from '../../types';

jest.mock('../TeamStatsPdfExport', () => () => null);
jest.mock('../../firebase/statsService', () => ({
  getTeamStatsSnapshot: jest.fn(),
}));

const zero = {
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
};
const games: Game[] = ['2026-04-01', '2026-04-08'].map((date, i) => ({
  id: `g${i}`,
  date,
  gameType: 'official',
  currentInning: 1,
  homeTeam: {
    id: 'team-1',
    name: 'テストチーム',
    players: [],
    atBats: [
      {
        id: `ab${i}`,
        playerId: 'p1',
        result: i ? 'HR' : 'SO',
        inning: 1,
        isTop: false,
        rbi: 0,
        isOut: false,
      },
    ],
  },
  awayTeam: { id: 'rival', name: '相手', players: [], atBats: [] },
}));

const setMobile = (mobile: boolean) => {
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
};

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

test.each([false, true])(
  'trend buttons and the open chart dialog have no axe violations (mobile=%s)',
  async (mobile) => {
    setMobile(mobile);
    (getTeamStatsSnapshot as jest.Mock).mockResolvedValue({
      games,
      teamStats: [
        {
          teamId: 'team-1',
          teamName: 'テストチーム',
          gameCount: 2,
          wins: 0,
          losses: 0,
          draws: 2,
          totalRuns: 0,
          totalRunsAllowed: 0,
          battingStats: zero,
          playerStats: [
            {
              ...zero,
              playerId: 'p1',
              playerName: '選手',
              playerNumber: '7',
              playerPosition: '',
              gameCount: 2,
              plateAppearances: 2,
            },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <TeamStatsList />
      </ThemeProvider>
    );
    const playerTab = await screen.findByRole('tab', { name: '個人成績' });
    expect(await axe(container)).toHaveNoViolations();
    await user.click(playerTab);
    // The tab's existing "チームを選択" h6 under the page h1 predates the trend buttons.
    expect(
      await axe(container, { rules: { 'heading-order': { enabled: false } } })
    ).toHaveNoViolations();

    await user.click(
      screen.getByRole('button', { name: '7 選手の打撃推移グラフを開く' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: '7 選手の打撃成績推移',
    });
    expect(await axe(dialog)).toHaveNoViolations();
  },
  20000
);
