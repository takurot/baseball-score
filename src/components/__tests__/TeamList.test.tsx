import React from 'react';
import nodeCrypto from 'crypto';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamList from '../TeamList';
import {
  getUserTeams,
  createTeam,
  deleteTeam,
  addPlayerToTeam,
} from '../../firebase/teamService';
import { useAuth } from '../../contexts/AuthContext';
import { TeamSetting } from '../../types';

// jsdom 環境における Web Crypto の polyfill (uuid v4 対応)
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: (nodeCrypto as any).webcrypto ?? {
      randomUUID: () => '00000000-0000-0000-0000-000000000000',
      getRandomValues: (arr: any) => nodeCrypto.randomBytes(arr.length),
    },
    configurable: true,
  });
} else if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  Object.defineProperty(globalThis.crypto, 'getRandomValues', {
    value: (arr: any) => nodeCrypto.randomBytes(arr.length),
    configurable: true,
  });
}

jest.mock('../../firebase/teamService', () => ({
  getUserTeams: jest.fn(),
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  addPlayerToTeam: jest.fn(),
  updatePlayerInTeam: jest.fn(),
  removePlayerFromTeam: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedGetUserTeams = getUserTeams as jest.MockedFunction<
  typeof getUserTeams
>;
const mockedCreateTeam = createTeam as jest.MockedFunction<typeof createTeam>;
const mockedAddPlayerToTeam = addPlayerToTeam as jest.MockedFunction<
  typeof addPlayerToTeam
>;
const mockedDeleteTeam = deleteTeam as jest.MockedFunction<typeof deleteTeam>;
const mockedUseAuth = useAuth as jest.Mock;

const mockTeams: TeamSetting[] = [
  {
    id: 'team-1',
    name: 'ライオンズ',
    userId: 'user-1',
    userEmail: 'user1@example.com',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    players: [
      {
        id: 'player-1',
        name: '山田 太郎',
        number: '1',
        position: '投手',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
  },
];

const renderTeamList = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <TeamList />
    </ThemeProvider>
  );

describe('TeamList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: { uid: 'user-1', email: 'user1@example.com' },
    });
    mockedGetUserTeams.mockResolvedValue(mockTeams);
  });

  test('初回レンダリング時にチーム一覧が表示される', async () => {
    renderTeamList();

    expect(screen.getByText('チーム情報を読み込み中...')).toBeInTheDocument();
    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();
    expect(
      screen.queryByText('チーム情報を読み込み中...')
    ).not.toBeInTheDocument();
  });

  test('チーム作成時、保存中はボタンが無効化され、完了後に再取得時に全画面ローディングにならない', async () => {
    let resolveCreate: (id: string) => void = () => {};
    const createPromise = new Promise<string>((resolve) => {
      resolveCreate = resolve;
    });
    mockedCreateTeam.mockReturnValue(createPromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // 「新しいチームを作成」ボタンをクリック
    const newTeamButton = screen.getByRole('button', {
      name: '新しいチームを作成',
    });
    await user.click(newTeamButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const nameInput = screen.getByLabelText('チーム名');
    await user.type(nameInput, 'タイガース');

    const saveButton = screen.getByRole('button', { name: '保存' });
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });

    // 保存ボタンをクリック（非同期完了を待たずに保留中状態を検証するため fireEvent を使用）
    fireEvent.click(saveButton);

    // 保存中はボタンが無効化され、スピナーが表示されていること
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(
      saveButton.querySelector('.MuiCircularProgress-root')
    ).toBeInTheDocument();

    // 解決
    resolveCreate('team-2');

    // ダイアログが閉じるのを待つ
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 再取得時に画面全体ローディング（「チーム情報を読み込み中...」）が表示されないこと
    expect(
      screen.queryByText('チーム情報を読み込み中...')
    ).not.toBeInTheDocument();
  });

  test('選手追加時、保存中はボタンが無効化され、完了後に再取得時に全画面ローディングにならない', async () => {
    let resolveAddPlayer: () => void = () => {};
    const addPlayerPromise = new Promise<void>((resolve) => {
      resolveAddPlayer = resolve;
    });
    mockedAddPlayerToTeam.mockReturnValue(addPlayerPromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // アコーディオンを開く
    const accordionHeader = screen.getByText('ライオンズ');
    await user.click(accordionHeader);

    const addPlayerButton = await screen.findByRole('button', {
      name: '選手を追加',
    });
    await user.click(addPlayerButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const nameInput = screen.getByLabelText('選手名');
    const numberInput = screen.getByLabelText('背番号');
    const positionInput = screen.getByLabelText('ポジション');

    await user.type(nameInput, '佐藤 次郎');
    await user.type(numberInput, '10');
    await user.type(positionInput, '捕手');

    const saveButton = screen.getByRole('button', { name: '保存' });
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });

    // 保存をクリック（保留中状態を検証するため fireEvent を使用）
    fireEvent.click(saveButton);

    // 保存中はボタンと入力が無効化され、スピナーが表示されること
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(
      saveButton.querySelector('.MuiCircularProgress-root')
    ).toBeInTheDocument();

    // 解決
    resolveAddPlayer();

    // ダイアログが閉じるのを待つ
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 画面全体ローディングにならないこと
    expect(
      screen.queryByText('チーム情報を読み込み中...')
    ).not.toBeInTheDocument();
  });

  test('チーム削除時、削除中はボタンが無効化され、スピナーが表示される', async () => {
    let resolveDelete: () => void = () => {};
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    mockedDeleteTeam.mockReturnValue(deletePromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // アコーディオンを開く
    const accordionHeader = screen.getByText('ライオンズ');
    await user.click(accordionHeader);

    // 削除ボタンをクリック
    const deleteButton = await screen.findByRole('button', {
      name: 'チームを削除',
    });
    await user.click(deleteButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('チームを削除しますか？')).toBeInTheDocument();

    const deleteConfirmButton = screen.getByRole('button', { name: '削除' });
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });

    // 削除確認をクリック
    fireEvent.click(deleteConfirmButton);

    // 削除中は無効化され、スピナーが表示されること
    expect(deleteConfirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(
      deleteConfirmButton.querySelector('.MuiCircularProgress-root')
    ).toBeInTheDocument();

    // 解決
    resolveDelete();

    // ダイアログが閉じるのを待つ
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 画面全体ローディングにならないこと
    expect(
      screen.queryByText('チーム情報を読み込み中...')
    ).not.toBeInTheDocument();
  });
});
