import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamStatsList from '../TeamStatsList';
import {
  getTeamStatsSnapshot,
  TeamStats,
  TeamStatsSnapshot,
} from '../../firebase/statsService';
import { AtBat, Game, HitResult, Team } from '../../types';
import { TREND_SERIES } from '../../services/BattingTrendChart';

jest.mock('../TeamStatsPdfExport', () => () => null);
jest.mock('../../firebase/statsService', () => ({
  getTeamStatsSnapshot: jest.fn(),
}));

const mockedSnapshot = getTeamStatsSnapshot as jest.MockedFunction<
  typeof getTeamStatsSnapshot
>;

let seq = 0;
const ab = (playerId: string, result: HitResult): AtBat => ({
  id: `ab-${seq++}`,
  playerId,
  result,
  inning: 1,
  isTop: false,
  rbi: 0,
  isOut: false,
});
const roster = [
  {
    id: 'p1',
    name: '打者A',
    number: '1',
    position: '',
    isActive: true,
    order: 1,
  },
  {
    id: 'p2',
    name: '控え',
    number: '2',
    position: '',
    isActive: true,
    order: 2,
  },
];
const own = (atBats: AtBat[]): Team => ({
  id: 'team-1',
  name: '全勝チーム',
  players: roster,
  atBats,
});
const rival = (name: string): Team => ({
  id: 'rival',
  name,
  players: [],
  atBats: [],
});
const game = (id: string, date: string, home: Team, away: Team): Game => ({
  id,
  date,
  homeTeam: home,
  awayTeam: away,
  currentInning: 1,
  gameType: 'official',
});
const games: Game[] = [
  game(
    'g2',
    '2026-04-08',
    own([ab('p1', 'GO_SS'), ab('p1', 'SO'), ab('p1', 'FO_LF')]),
    rival('南中')
  ),
  game('g0', '2026-03-25', own([]), rival('西中')),
  game('g3', '2026-04-08', rival('東中'), own([ab('p1', 'BB')])),
  game(
    'g1',
    '2026-04-01',
    rival('北中'),
    own([ab('p1', 'IH'), ab('p1', 'SO')])
  ),
];

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
const teamStats: TeamStats = {
  teamId: 'team-1',
  teamName: '全勝チーム',
  gameCount: 4,
  wins: 0,
  losses: 0,
  draws: 4,
  totalRuns: 0,
  totalRunsAllowed: 0,
  battingStats: { ...zero, atBats: 5, hits: 1, battingAvg: 0.2 },
  playerStats: [
    {
      ...zero,
      atBats: 5,
      hits: 1,
      battingAvg: 0.2,
      playerId: 'p1',
      playerName: '打者A',
      playerNumber: '1',
      playerPosition: '',
      gameCount: 4,
      plateAppearances: 6,
    },
    {
      ...zero,
      playerId: 'p2',
      playerName: '控え',
      playerNumber: '2',
      playerPosition: '',
      gameCount: 4,
      plateAppearances: 0,
    },
  ],
};
const snapshot = (overrides: Partial<TeamStatsSnapshot> = {}) => ({
  games,
  teamStats: [teamStats],
  ...overrides,
});

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

const renderList = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <TeamStatsList />
    </ThemeProvider>
  );

const rowTexts = (dialog: HTMLElement) =>
  within(within(dialog).getByRole('table', { name: '試合ごとの累積値' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent)
    );

const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  window.history.replaceState({}, '', '/?view=teamStats');
  setMobile(false);
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

test('opens cumulative team values from the team name and returns focus on Escape', async () => {
  mockedSnapshot.mockResolvedValue(snapshot());
  const user = userEvent.setup();
  renderList();
  const open = await screen.findByRole('button', {
    name: '全勝チームの打撃推移グラフを開く',
  });
  await user.click(open);

  const dialog = screen.getByRole('dialog', {
    name: '全勝チームの打撃成績推移',
  });
  expect(dialog).toHaveTextContent('試合区分: すべて（統合）');
  expect(dialog).toHaveTextContent('対象期間: 2026-03-25〜2026-04-08（4試合）');
  expect(dialog).toHaveTextContent('実際の開催順とは限りません');
  expect(
    within(within(dialog).getByRole('list', { name: '凡例' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  ).toEqual(['打率', '出塁率', '長打率', 'OPS']);
  expect(rowTexts(dialog)).toEqual([
    ['2026-03-25', '西中', '—', '—', '—', '—'],
    ['2026-04-01', '北中', '.500', '.500', '.500', '1.000'],
    ['2026-04-08 (1)', '南中', '.200', '.200', '.200', '.400'],
    ['2026-04-08 (2)', '東中', '.200', '.333', '.200', '.533'],
  ]);
  expect(
    within(dialog)
      .getAllByTestId('trend-tick')
      .map((tick) => tick.textContent)
  ).toEqual(['.000', '.200', '.400', '.600', '.800', '1.000']);
  for (const series of TREND_SERIES) {
    const group = dialog.querySelector(`[data-series="${series.metric}"]`);
    expect(group?.querySelector('path[fill="none"]')).toHaveAttribute(
      'stroke',
      series.color
    );
  }

  await user.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
  expect(open).toHaveFocus();
  expect(mockedSnapshot).toHaveBeenCalledTimes(1);
});

test('selects games by pointer and keyboard, and shows missing values before the first plate appearance', async () => {
  mockedSnapshot.mockResolvedValue(snapshot());
  const user = userEvent.setup();
  renderList();
  await user.click(await screen.findByRole('tab', { name: '個人成績' }));
  await user.click(
    screen.getByRole('button', { name: '1 打者Aの打撃推移グラフを開く' })
  );
  const dialog = screen.getByRole('dialog', { name: '1 打者Aの打撃成績推移' });
  expect(dialog).toHaveTextContent('チーム: 全勝チーム');
  expect(rowTexts(dialog)[0]).toEqual([
    '2026-03-25',
    '西中',
    '—',
    '—',
    '—',
    '—',
  ]);
  expect(dialog).toHaveTextContent(
    '選択中: 2026-04-08 (2) 対 東中（試合ID: g3）: 打率 .200、出塁率 .333'
  );

  const chart = within(dialog).getByRole('group', { name: /推移グラフ/ });
  chart.focus();
  await user.keyboard('{ArrowLeft}');
  expect(dialog).toHaveTextContent('選択中: 2026-04-08 (1) 対 南中');
  await user.keyboard('{Home}');
  expect(dialog).toHaveTextContent(
    '選択中: 2026-03-25 対 西中（試合ID: g0）: 初打席前のため値なし'
  );
  await user.click(dialog.querySelector('[data-game-id="g1"]')!);
  expect(dialog).toHaveTextContent(
    '選択中: 2026-04-01 対 北中（試合ID: g1）: 打率 .500'
  );

  await user.click(within(dialog).getByRole('button', { name: '閉じる' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
  await user.click(
    screen.getByRole('button', { name: '2 控えの打撃推移グラフを開く' })
  );
  const reserve = screen.getByRole('dialog', { name: '2 控えの打撃成績推移' });
  expect(reserve).toHaveTextContent('打席記録なし');
  expect(within(reserve).queryByRole('table')).not.toBeInTheDocument();
  expect(mockedSnapshot).toHaveBeenCalledTimes(1);
});

test('mobile opens a player chart from a button beside, not inside, the accordion', async () => {
  setMobile(true);
  mockedSnapshot.mockResolvedValue(snapshot());
  const user = userEvent.setup();
  renderList();
  await user.click(await screen.findByRole('tab', { name: '個人成績' }));
  const open = screen.getByRole('button', {
    name: '1 打者Aの打撃推移グラフを開く',
  });
  expect(open.parentElement?.closest('button, [role="button"]')).toBeNull();
  expect(open.querySelector('button, [role="button"]')).toBeNull();

  await user.click(screen.getByRole('button', { name: /打者A.*打率/ }));
  expect(screen.getByText('打席: 6')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await user.click(open);
  expect(
    screen.getByRole('dialog', { name: '1 打者Aの打撃成績推移' })
  ).toBeInTheDocument();
});

test('aborts the chart with the reason when a game date cannot be ordered', async () => {
  mockedSnapshot.mockResolvedValue(
    snapshot({
      games: [...games, game('broken', '', own([ab('p1', 'HR')]), rival('X'))],
    })
  );
  const user = userEvent.setup();
  renderList();
  await user.click(
    await screen.findByRole('button', {
      name: '全勝チームの打撃推移グラフを開く',
    })
  );
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('alert')).toHaveTextContent(
    /試合日付が不正.*broken/
  );
  expect(within(dialog).queryByRole('table')).not.toBeInTheDocument();
});

test('closes on a filter change and waits for that filter before reopening', async () => {
  let resolvePractice: (value: TeamStatsSnapshot) => void = () => {};
  mockedSnapshot.mockResolvedValueOnce(snapshot()).mockReturnValueOnce(
    new Promise((resolve) => {
      resolvePractice = resolve;
    })
  );
  const user = userEvent.setup();
  renderList();
  const name = { name: '全勝チームの打撃推移グラフを開く' };
  await user.click(await screen.findByRole('button', name));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  act(() => {
    window.history.pushState({}, '', '/?view=teamStats&gameType=practice');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
  expect(screen.getByRole('button', name)).toBeDisabled();

  await act(async () => {
    resolvePractice(
      snapshot({
        games: games.map((g) => ({ ...g, gameType: 'practice' as const })),
      })
    );
  });
  await waitFor(() => expect(screen.getByRole('button', name)).toBeEnabled());
  await user.click(screen.getByRole('button', name));
  expect(screen.getByRole('dialog')).toHaveTextContent('試合区分: 練習試合');
  expect(mockedSnapshot).toHaveBeenCalledTimes(2);
});
