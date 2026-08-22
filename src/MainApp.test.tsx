import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

// 打席登録ボタンを選手名から特定して押す
const registerAtBatFor = async (
  user: ReturnType<typeof userEvent.setup>,
  playerName: string
) => {
  const nameCell = await screen.findByText(playerName);
  const row = nameCell.closest('tr');
  if (!row) throw new Error(`row for ${playerName} not found`);
  await user.click(within(row).getByRole('button', { name: '打席登録' }));
};

describe('MainApp - 打席結果編集ダイアログ', () => {
  test('編集対象打席の選手名が正しく表示される（選択中の選手と異なる場合も）', async () => {
    const user = userEvent.setup();
    renderMainApp();

    // 選手1の打席を登録する
    await registerAtBatFor(user, '選手1');
    expect(
      await screen.findByRole('heading', { name: /打席結果登録: 選手1/ })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '登録' }));

    // 登録完了でダイアログが閉じ、selectedPlayer は null に戻る
    await screen.findByRole('button', { name: '編集' });

    // 選手2の打席を登録する（selectedPlayer が別の選手に変わる状況を作る）
    await registerAtBatFor(user, '選手2');
    await user.click(screen.getByRole('button', { name: '登録' }));

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
  }, 15000);
});
