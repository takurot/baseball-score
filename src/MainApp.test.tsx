import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MainApp from './MainApp';

let mockUuidCounter = 0;
jest.mock('uuid', () => ({ v4: () => `test-uuid-${mockUuidCounter++}` }));

jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user', email: 'test@example.com' },
    isLoading: false,
  }),
}));

jest.mock('./firebase/gameService', () => ({
  saveGame: jest.fn(),
  getGameById: jest.fn(),
  getSharedGameById: jest.fn().mockResolvedValue(null),
  saveGameAsNew: jest.fn(),
}));

jest.mock('./firebase/teamService', () => ({
  getTeamById: jest.fn(),
  getUserTeams: jest.fn().mockResolvedValue([]),
}));

jest.mock('./firebase/analyticsClient', () => ({
  logAnalyticsEvent: jest.fn(),
}));

const renderMainApp = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <MainApp toggleColorMode={jest.fn()} mode="light" />
    </ThemeProvider>
  );

const findPlayerRow = async (playerName: string) => {
  const nameCell = await screen.findByText(playerName);
  const row = nameCell.closest('tr');
  if (!row) throw new Error(`row for ${playerName} not found`);
  return row;
};

// 打席登録ボタンを選手名から特定して押す
const registerAtBatFor = async (
  user: ReturnType<typeof userEvent.setup>,
  playerName: string
) => {
  const row = await findPlayerRow(playerName);
  await user.click(within(row).getByRole('button', { name: '打席登録' }));
};

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'メニューを開く' }));
};

// 打席を登録する（結果選択→登録）ところまで実行する
const registerAndSubmitAtBat = async (
  user: ReturnType<typeof userEvent.setup>,
  playerName: string,
  resultLabel: string = '内野安打'
) => {
  await registerAtBatFor(user, playerName);
  await screen.findByRole('heading', { name: /打席結果登録/ });
  await user.click(screen.getByRole('button', { name: resultLabel }));
  await user.click(screen.getByRole('button', { name: '登録' }));
};

// localStorage の下書きはテスト間で共有されるため、各テストの開始前に必ずクリアする
// （前のテストが残した下書きが後続テストで復元ダイアログを誘発し、背景が
// aria-hidden になって要素が見つからなくなるのを防ぐ）
beforeEach(() => {
  localStorage.clear();
});

describe('MainApp - 打席登録フロー', () => {
  test('初期状態では打順1番の選手が次打者として表示される', async () => {
    renderMainApp();

    const row = await findPlayerRow('選手1');
    expect(within(row).getByText('次打者')).toBeInTheDocument();
  }, 30000);

  test('打席結果を選ばずに登録することはできない', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await registerAtBatFor(user, '選手1');
    await screen.findByRole('heading', { name: /打席結果登録/ });

    expect(await screen.findByRole('button', { name: '登録' })).toBeDisabled();
  }, 30000);

  test('打席登録後、次打者の表示とフォーカスが選手2に進む', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await registerAndSubmitAtBat(user, '選手1');

    // ダイアログが閉じ、選手2が次打者として表示される
    const nextRow = await findPlayerRow('選手2');
    await waitFor(() => {
      expect(within(nextRow).getByText('次打者')).toBeInTheDocument();
    });

    // 選手2の打席登録ボタンへフォーカスが進む
    await waitFor(() => {
      expect(
        within(nextRow).getByRole('button', { name: '打席登録' })
      ).toHaveFocus();
    });
  }, 30000);
});

describe('MainApp - 試合データの損失防止', () => {
  test('未保存の変更がない状態で「新しい試合」を選ぶと確認なしでリセットされる', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /新しい試合/ }));

    // 確認ダイアログは表示されない
    expect(
      screen.queryByText('保存されていない変更があります')
    ).not.toBeInTheDocument();
  }, 30000);

  test('未保存の変更がある状態で「新しい試合」を選ぶと確認ダイアログが出て、キャンセルするとデータが残る', async () => {
    const user = userEvent.setup();
    renderMainApp();

    // 選手1の打席を登録して未保存の変更を作る
    await registerAndSubmitAtBat(user, '選手1');
    await screen.findByRole('button', { name: '編集' });

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /新しい試合/ }));

    const dialogTitle =
      await screen.findByText('保存されていない変更があります');
    expect(dialogTitle).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // ダイアログが閉じ、打席記録は残っている
    await waitFor(() => {
      expect(
        screen.queryByText('保存されていない変更があります')
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
  }, 30000);

  test('確認ダイアログで「新しい試合を開始」を選ぶと打席記録がリセットされる', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await registerAndSubmitAtBat(user, '選手1');
    await screen.findByRole('button', { name: '編集' });

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /新しい試合/ }));
    await screen.findByText('保存されていない変更があります');

    await user.click(screen.getByRole('button', { name: '新しい試合を開始' }));

    await waitFor(() => {
      expect(
        screen.queryByText('保存されていない変更があります')
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: '編集' })
    ).not.toBeInTheDocument();
  }, 30000);

  test('「元に戻す」で打席登録を取り消し、「やり直す」で再度反映できる', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await registerAndSubmitAtBat(user, '選手1');
    await screen.findByRole('button', { name: '編集' });

    await user.click(screen.getByRole('button', { name: '元に戻す' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: '編集' })
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'やり直す' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    });
  }, 30000);

  test('リロードを想定した再マウント時に下書きの復元を提案する', async () => {
    const user = userEvent.setup();
    const { unmount } = renderMainApp();

    await registerAndSubmitAtBat(user, '選手1');
    await screen.findByRole('button', { name: '編集' });

    // デバウンス後に下書きが localStorage に保存されるのを待つ
    await waitFor(
      () => {
        expect(
          localStorage.getItem('baseball-score:draft:test-user')
        ).not.toBeNull();
      },
      { timeout: 3000 }
    );

    unmount();

    // リロード相当の再マウント
    renderMainApp();

    const restoreDialog =
      await screen.findByText('前回の入力途中の試合があります');
    expect(restoreDialog).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '復元する' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    });
  }, 30000);
});

describe('MainApp - 打席結果編集ダイアログ', () => {
  test('編集対象打席の選手名が正しく表示される（選択中の選手と異なる場合も）', async () => {
    const user = userEvent.setup();
    renderMainApp();

    // 選手1の打席を登録する
    await registerAndSubmitAtBat(user, '選手1');

    // 登録完了でダイアログが閉じ、selectedPlayer は null に戻る
    await screen.findByRole('button', { name: '編集' });

    // 選手2の打席を登録する（selectedPlayer が別の選手に変わる状況を作る）
    await registerAndSubmitAtBat(user, '選手2');

    // 選手1の打席を編集する
    const editButtons = await screen.findAllByRole('button', {
      name: '編集',
    });
    await user.click(editButtons[0]);

    const title = await screen.findByRole('heading', {
      name: /打席結果編集/,
    });
    expect(title).toHaveTextContent('選手1');
    expect(title).not.toHaveTextContent('不明な選手');
  }, 30000);
});

describe('MainApp - コメントアウト残骸の除去', () => {
  // デスクトップ用の試合日ボタンは <Hidden smDown> 配下にあり、MUI の Hidden は
  // window.matchMedia に依存するため jsdom では常に非表示（そもそも DOM に
  // 現れない）になり、この環境では自動テストで検証できない。修正内容
  // （モバイル版と同じ gameState.date を表示する）は目視・コードレビューで
  // 確認する。保存ダイアログ側（Hidden に依存しない）は下記でテストする。

  test('保存ダイアログに日付と対戦カードが表示される（空行ではない）', async () => {
    const user = userEvent.setup();
    renderMainApp();

    await user.click(screen.getByRole('button', { name: '試合データを保存' }));

    const dialog = await screen.findByRole('dialog');
    const expectedDate = new Date().toLocaleDateString('ja-JP');
    expect(
      within(dialog).getByText(`日付: ${expectedDate}`)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/対戦: .+ vs .+/)).toBeInTheDocument();
  }, 15000);
});

describe('MainApp - 表示モード切替', () => {
  test('Stepper や次へ/戻るボタンが存在せず、AppBar の切り替えボタンで一覧表示と入力画面を切り替えられる', async () => {
    const { logAnalyticsEvent } = require('./firebase/analyticsClient');
    const user = userEvent.setup();
    renderMainApp();

    // Stepper や手順用の戻る/次へボタンが存在しないこと
    expect(screen.queryByText('プレー入力')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '次へ' })
    ).not.toBeInTheDocument();

    // 初期状態はプレー入力画面（1回の操作 セクションが表示）
    expect(screen.getByText('1回の操作')).toBeInTheDocument();

    // 一覧表示ボタンをクリック
    const toggleButton = screen.getByRole('button', {
      name: '一覧表示に切り替え',
    });
    await user.click(toggleButton);

    // アナリティクスイベントが送出されること
    expect(logAnalyticsEvent).toHaveBeenCalledWith('view_mode_change', {
      mode: 'summary',
    });

    // 編集モードに戻るボタンに変わること
    expect(
      screen.getByRole('button', { name: '編集モードに戻る' })
    ).toBeInTheDocument();

    // 編集モードに戻る
    await user.click(screen.getByRole('button', { name: '編集モードに戻る' }));
    expect(logAnalyticsEvent).toHaveBeenCalledWith('view_mode_change', {
      mode: 'edit',
    });
    expect(screen.getByText('1回の操作')).toBeInTheDocument();
  }, 15000);
});
