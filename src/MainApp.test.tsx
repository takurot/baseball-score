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
