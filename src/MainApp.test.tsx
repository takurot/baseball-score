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

const registerAtBatFor = async (
  user: ReturnType<typeof userEvent.setup>,
  playerName: string
) => {
  const row = await findPlayerRow(playerName);
  await user.click(within(row).getByRole('button', { name: '打席登録' }));
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

    await registerAtBatFor(user, '選手1');
    await screen.findByRole('heading', { name: /打席結果登録: 選手1/ });

    await user.click(screen.getByRole('button', { name: '内野安打' }));
    await user.click(screen.getByRole('button', { name: '登録' }));

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
