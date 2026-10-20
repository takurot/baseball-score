import React from 'react';
import nodeCrypto from 'crypto';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TeamList from '../TeamList';
import {
  getUserTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
  updatePlayerInTeam,
  removePlayerFromTeam,
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
const mockedUpdateTeam = updateTeam as jest.MockedFunction<typeof updateTeam>;
const mockedDeleteTeam = deleteTeam as jest.MockedFunction<typeof deleteTeam>;
const mockedAddPlayerToTeam = addPlayerToTeam as jest.MockedFunction<
  typeof addPlayerToTeam
>;
const mockedUpdatePlayerInTeam = updatePlayerInTeam as jest.MockedFunction<
  typeof updatePlayerInTeam
>;
const mockedRemovePlayerFromTeam = removePlayerFromTeam as jest.MockedFunction<
  typeof removePlayerFromTeam
>;
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

  test('チーム作成時、ダイアログが即座に閉じて楽観的に一覧へ反映され、getUserTeams は再実行されない', async () => {
    let resolveCreate: (id: string) => void = () => {};
    const createPromise = new Promise<string>((resolve) => {
      resolveCreate = resolve;
    });
    mockedCreateTeam.mockReturnValue(createPromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

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
    await user.click(saveButton);

    // サーバーレスポンス（resolveCreate）を待たずにダイアログが閉じ、一覧に即座に表示される
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('タイガース')).toBeInTheDocument();

    // getUserTeams による全件再取得は実行されない（初回のみの1回）
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // サーバー処理を解決
    resolveCreate('team-2');
    await waitFor(() => {
      expect(screen.getByText('タイガース')).toBeInTheDocument();
    });
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);
  });

  test('チーム作成がサーバーで失敗した場合、ロールバックされてエラーが表示される', async () => {
    mockedCreateTeam.mockRejectedValue(new Error('ネットワーク接続エラー'));

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    const newTeamButton = screen.getByRole('button', {
      name: '新しいチームを作成',
    });
    await user.click(newTeamButton);

    const nameInput = screen.getByLabelText('チーム名');
    await user.type(nameInput, 'タイガース');

    const saveButton = screen.getByRole('button', { name: '保存' });
    await user.click(saveButton);

    // 即座にダイアログは閉じる
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 失敗により一覧からロールバックされ、エラー Alert が表示される
    await waitFor(() => {
      expect(screen.queryByText('タイガース')).not.toBeInTheDocument();
      expect(
        screen.getByText(/チームの保存に失敗しました.*ネットワーク接続エラー/)
      ).toBeInTheDocument();
    });
  });

  test('選手追加時、ダイアログが即座に閉じて楽観的に一覧へ反映され、エラー時はロールバックされる', async () => {
    let rejectAddPlayer: (err: Error) => void = () => {};
    const addPlayerPromise = new Promise<any>((_, reject) => {
      rejectAddPlayer = reject;
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
    await user.click(saveButton);

    // レスポンスを待たずにダイアログが閉じ、即座に一覧に追加される
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/佐藤 次郎/)).toBeInTheDocument();

    // 全件再取得は呼ばれない
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // サーバーエラー発生
    rejectAddPlayer(new Error('Firestoreエラー'));

    // ロールバックされて選手が消え、エラーが表示される
    await waitFor(() => {
      expect(screen.queryByText(/佐藤 次郎/)).not.toBeInTheDocument();
      expect(
        screen.getByText(/選手の保存に失敗しました.*Firestoreエラー/)
      ).toBeInTheDocument();
    });
  });

  test('チーム削除時、即座に一覧から除外され、エラー時はロールバックされる', async () => {
    let rejectDelete: (err: Error) => void = () => {};
    const deletePromise = new Promise<void>((_, reject) => {
      rejectDelete = reject;
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

    const deleteConfirmButton = screen.getByRole('button', { name: '削除' });
    await user.click(deleteConfirmButton);

    // 即座にダイアログが閉じ、一覧からライオンズが消える
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('ライオンズ')).not.toBeInTheDocument();

    // 全件再取得は実行されない
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // 削除が失敗
    rejectDelete(new Error('削除権限エラー'));

    // ロールバックされてライオンズが一覧に戻り、エラーが表示される
    await waitFor(() => {
      expect(screen.getByText('ライオンズ')).toBeInTheDocument();
      expect(
        screen.getByText(/チームの削除に失敗しました.*削除権限エラー/)
      ).toBeInTheDocument();
    });
  });

  test('選手削除時、即座に一覧から除外され、エラー時はロールバックされる', async () => {
    let rejectRemovePlayer: (err: Error) => void = () => {};
    const removePlayerPromise = new Promise<void>((_, reject) => {
      rejectRemovePlayer = reject;
    });
    mockedRemovePlayerFromTeam.mockReturnValue(removePlayerPromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // アコーディオンを開く
    const accordionHeader = screen.getByText('ライオンズ');
    await user.click(accordionHeader);

    expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();

    // 選手の削除ボタンをクリック
    const deleteButton = screen.getByRole('button', { name: 'delete' });
    await user.click(deleteButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const deleteConfirmButton = screen.getByRole('button', { name: '削除' });
    await user.click(deleteConfirmButton);

    // 即座にダイアログが閉じ、一覧から山田 太郎が消える
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/山田 太郎/)).not.toBeInTheDocument();

    // 全件再取得は実行されない
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // 削除失敗
    rejectRemovePlayer(new Error('選手削除エラー'));

    // ロールバックされて山田 太郎が一覧に戻り、エラーが表示される
    await waitFor(() => {
      expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();
      expect(
        screen.getByText(/選手の削除に失敗しました.*選手削除エラー/)
      ).toBeInTheDocument();
    });
  });

  test('チーム名未入力で保存を押した際、ダイアログ内にエラーが表示される', async () => {
    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    const newTeamButton = screen.getByRole('button', {
      name: '新しいチームを作成',
    });
    await user.click(newTeamButton);

    const dialog = screen.getByRole('dialog');
    const saveButton = screen.getByRole('button', { name: '保存' });

    // 未入力のまま保存をクリック
    await user.click(saveButton);

    // ダイアログ内の Alert にエラーが表示されること
    const dialogAlert = dialog.querySelector('.MuiAlert-root');
    expect(dialogAlert).toBeInTheDocument();
    expect(dialogAlert).toHaveTextContent('チーム名を入力してください');
    // ダイアログは開いたままであること
    expect(dialog).toBeInTheDocument();
  });

  test('チーム名編集時、即座に一覧へ反映され、エラー時は元の名前にロールバックされる', async () => {
    let rejectUpdate: (err: Error) => void = () => {};
    const updatePromise = new Promise<void>((_, reject) => {
      rejectUpdate = reject;
    });
    mockedUpdateTeam.mockReturnValue(updatePromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // アコーディオンを開く
    const accordionHeader = screen.getByText('ライオンズ');
    await user.click(accordionHeader);

    // チーム名編集ボタンをクリック
    const editButton = screen.getByRole('button', { name: 'チーム名を編集' });
    await user.click(editButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const nameInput = screen.getByLabelText('チーム名');
    await user.clear(nameInput);
    await user.type(nameInput, '新ライオンズ');

    const saveButton = screen.getByRole('button', { name: '保存' });
    await user.click(saveButton);

    // 即座にダイアログが閉じ、新しい名前が表示される
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('新ライオンズ')).toBeInTheDocument();
    expect(screen.queryByText('ライオンズ')).not.toBeInTheDocument();

    // 全件再取得は実行されない
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // 更新失敗
    rejectUpdate(new Error('チーム更新エラー'));

    // 元の名前にロールバックされ、エラーが表示される
    await waitFor(() => {
      expect(screen.getByText('ライオンズ')).toBeInTheDocument();
      expect(screen.queryByText('新ライオンズ')).not.toBeInTheDocument();
      expect(
        screen.getByText(/チームの更新に失敗しました.*チーム更新エラー/)
      ).toBeInTheDocument();
    });
  });

  test('選手編集時、即座に一覧へ反映され、エラー時は元の選手データにロールバックされる', async () => {
    let rejectUpdatePlayer: (err: Error) => void = () => {};
    const updatePlayerPromise = new Promise<void>((_, reject) => {
      rejectUpdatePlayer = reject;
    });
    mockedUpdatePlayerInTeam.mockReturnValue(updatePlayerPromise);

    const user = userEvent.setup();
    renderTeamList();

    expect(await screen.findByText('ライオンズ')).toBeInTheDocument();

    // アコーディオンを開く
    const accordionHeader = screen.getByText('ライオンズ');
    await user.click(accordionHeader);

    expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();

    // 選手の編集ボタンをクリック
    const editButton = screen.getByRole('button', { name: 'edit' });
    await user.click(editButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const nameInput = screen.getByLabelText('選手名');
    await user.clear(nameInput);
    await user.type(nameInput, '山田 改');

    const saveButton = screen.getByRole('button', { name: '保存' });
    await user.click(saveButton);

    // 即座にダイアログが閉じ、編集後の名前が表示される
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/山田 改/)).toBeInTheDocument();
    expect(screen.queryByText(/山田 太郎/)).not.toBeInTheDocument();

    // 全件再取得は実行されない
    expect(mockedGetUserTeams).toHaveBeenCalledTimes(1);

    // 更新失敗
    rejectUpdatePlayer(new Error('選手更新エラー'));

    // 元の名前にロールバックされ、エラーが表示される
    await waitFor(() => {
      expect(screen.getByText(/山田 太郎/)).toBeInTheDocument();
      expect(screen.queryByText(/山田 改/)).not.toBeInTheDocument();
      expect(
        screen.getByText(/選手の保存に失敗しました.*選手更新エラー/)
      ).toBeInTheDocument();
    });
  });
});
