import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GameList from '../GameList';
import {
  getAllGames,
  updateGamePublicStatus,
} from '../../firebase/gameService';
import { Game } from '../../types';

jest.mock('../../firebase/gameService', () => ({
  getAllGames: jest.fn(),
  deleteGame: jest.fn(),
  updateGamePublicStatus: jest.fn(),
}));

const mockedGetAllGames = getAllGames as jest.MockedFunction<
  typeof getAllGames
>;
const mockedUpdateGamePublicStatus =
  updateGamePublicStatus as jest.MockedFunction<typeof updateGamePublicStatus>;

const makeGame = (id: string, overrides: Partial<Game> = {}): Game => ({
  id,
  date: '2026-08-22',
  currentInning: 0,
  tournament: '大会',
  homeTeam: { id: `${id}-home`, name: `${id}ホーム`, players: [], atBats: [] },
  awayTeam: {
    id: `${id}-away`,
    name: `${id}アウェイ`,
    players: [],
    atBats: [],
  },
  ...overrides,
});

const renderGameList = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <GameList onSelectGame={jest.fn()} />
    </ThemeProvider>
  );

describe('GameList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('clipboardへのコピー失敗時は失敗メッセージだけを表示する', async () => {
    mockedGetAllGames.mockResolvedValue([
      makeGame('game-1', { isPublic: true }),
    ]);
    const user = userEvent.setup();
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderGameList();

    await user.click(
      await screen.findByRole('button', { name: 'copy share link' })
    );
    await user.click(screen.getByRole('button', { name: 'URLをコピー' }));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'URLのコピーに失敗しました。手動でコピーしてください。'
      )
    );
    expect(alert).not.toHaveBeenCalledWith(
      'URLをクリップボードにコピーしました'
    );
  });

  test('並行する公開切り替えの完了順が逆でも両方の状態を保持する', async () => {
    mockedGetAllGames.mockResolvedValue([
      makeGame('game-1'),
      makeGame('game-2'),
    ]);
    const resolvers = new Map<string, () => void>();
    mockedUpdateGamePublicStatus.mockImplementation(
      (gameId) =>
        new Promise<void>((resolve) => {
          resolvers.set(gameId, resolve);
        })
    );
    const user = userEvent.setup();
    renderGameList();

    const switches = await screen.findAllByRole('checkbox');
    await user.click(switches[0]);
    await user.click(switches[1]);
    resolvers.get('game-2')?.();
    await waitFor(() => expect(switches[1]).toBeChecked());
    resolvers.get('game-1')?.();

    await waitFor(() => {
      expect(switches[0]).toBeChecked();
      expect(switches[1]).toBeChecked();
    });
  });

  test('公開切り替え失敗時も試合一覧を表示し続ける', async () => {
    mockedGetAllGames.mockResolvedValue([makeGame('game-1')]);
    mockedUpdateGamePublicStatus.mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    renderGameList();

    await user.click(await screen.findByRole('checkbox'));

    expect(
      await screen.findByText('公開設定の更新に失敗しました。')
    ).toBeInTheDocument();
    expect(
      screen.getByText('game-1アウェイ vs game-1ホーム')
    ).toBeInTheDocument();
  });

  test('currentInningが0でも文字列の0を描画しない', async () => {
    mockedGetAllGames.mockResolvedValue([makeGame('game-1')]);
    const { container } = renderGameList();

    await screen.findByText('game-1アウェイ vs game-1ホーム');
    expect(container).not.toHaveTextContent('大会0');
  });
});
