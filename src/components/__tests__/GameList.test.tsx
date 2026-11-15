import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

// 公開スイッチをONにすると、選手の個人情報が公開される旨の確認が表示される
const confirmPublish = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: '公開する' }));

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
    await confirmPublish(user);
    await user.click(switches[1]);
    await confirmPublish(user);
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
    await confirmPublish(user);

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

  test('各試合カードに公式戦・練習試合のバッジ（Chip）を表示する', async () => {
    mockedGetAllGames.mockResolvedValue([
      makeGame('game-official', {
        gameType: 'official',
        tournament: '春季大会',
      }),
      makeGame('game-practice', {
        gameType: 'practice',
        tournament: '',
      }),
      makeGame('game-legacy-official', {
        gameType: undefined,
        tournament: '夏季大会',
      }),
      makeGame('game-legacy-practice', {
        gameType: undefined,
        tournament: '',
      }),
    ]);
    renderGameList();

    const officialChips = await screen.findAllByText('公式戦');
    expect(officialChips).toHaveLength(2);

    const practiceChips = await screen.findAllByText('練習試合');
    expect(practiceChips).toHaveLength(2);
  });
});

describe('GameList - 公開時の注意喚起', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateGamePublicStatus.mockResolvedValue(undefined);
  });

  test('公開ONにすると、選手の個人情報が公開される旨を確認し、同意するまで公開しない', async () => {
    mockedGetAllGames.mockResolvedValue([makeGame('game-1')]);
    const user = userEvent.setup();
    renderGameList();

    await user.click(await screen.findByRole('checkbox'));

    const dialog = await screen.findByRole('dialog', {
      name: '試合を公開する前の確認',
    });
    expect(dialog).toHaveTextContent('選手');
    expect(dialog).toHaveTextContent('個人情報');
    expect(dialog).toHaveTextContent('URLを知っている');
    expect(dialog).toHaveTextContent('いつでも非公開に戻せます');
    expect(mockedUpdateGamePublicStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '公開する' }));
    await waitFor(() =>
      expect(mockedUpdateGamePublicStatus).toHaveBeenCalledWith('game-1', true)
    );
    // 背面は、ダイアログが閉じ終わるまで aria-hidden
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
  });

  test('キャンセルすると公開せず、スイッチもOFFのまま', async () => {
    mockedGetAllGames.mockResolvedValue([makeGame('game-1')]);
    const user = userEvent.setup();
    renderGameList();

    await user.click(await screen.findByRole('checkbox'));
    await user.click(await screen.findByRole('button', { name: 'キャンセル' }));

    expect(mockedUpdateGamePublicStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
  });

  test('非公開に戻すときは確認なしですぐに反映する', async () => {
    mockedGetAllGames.mockResolvedValue([
      makeGame('game-1', { isPublic: true }),
    ]);
    const user = userEvent.setup();
    renderGameList();

    await user.click(await screen.findByRole('checkbox'));

    await waitFor(() =>
      expect(mockedUpdateGamePublicStatus).toHaveBeenCalledWith('game-1', false)
    );
    expect(
      screen.queryByRole('dialog', { name: '試合を公開する前の確認' })
    ).not.toBeInTheDocument();
  });

  test('共有URLダイアログにも、公開範囲の注意文とポリシーへのリンクを表示する', async () => {
    mockedGetAllGames.mockResolvedValue([
      makeGame('game-1', { isPublic: true }),
    ]);
    const user = userEvent.setup();
    renderGameList();

    await user.click(
      await screen.findByRole('button', { name: 'copy share link' })
    );

    const dialog = await screen.findByRole('dialog', { name: '共有URL' });
    expect(dialog).toHaveTextContent('選手の氏名・背番号・打席記録');
    expect(dialog).toHaveTextContent('URLを知っている');
    await user.click(
      within(dialog).getByRole('button', { name: 'プライバシーポリシー' })
    );
    expect(
      await screen.findByRole('dialog', { name: 'プライバシーポリシー' })
    ).toBeInTheDocument();
  });
});
