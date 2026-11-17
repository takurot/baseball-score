import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import DeleteAccountDialog from '../DeleteAccountDialog';
import { AccountDeletionIncompleteError } from '../../firebase/accountErrors';
import { useAuth } from '../../contexts/AuthContext';
import { deleteAccount, getReauthMethod } from '../../firebase/accountService';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../firebase/accountService', () => ({
  deleteAccount: jest.fn(),
  getReauthMethod: jest.fn(),
}));

const mockedDelete = deleteAccount as jest.Mock;

const setup = ({ method = 'google' }: { method?: string } = {}) => {
  (useAuth as jest.Mock).mockReturnValue({
    currentUser: { uid: 'u1', email: 'me@example.com' },
  });
  (getReauthMethod as jest.Mock).mockReturnValue(method);
  const onClose = jest.fn();
  render(<DeleteAccountDialog open onClose={onClose} />);
  return { onClose, user: userEvent.setup() };
};

const deleteButton = () =>
  screen.getByRole('button', { name: 'アカウントを削除' });

describe('DeleteAccountDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('states that the deletion is permanent and what is deleted', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'アカウントを削除' });
    expect(dialog).toHaveTextContent('取り消せません');
    expect(dialog).toHaveTextContent('すべての試合');
    expect(dialog).toHaveTextContent('チーム');
    expect(dialog).toHaveTextContent('共有リンク');
  });

  it('keeps the delete button disabled until the user confirms', async () => {
    const { user } = setup();
    expect(deleteButton()).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: /取り消せないことを理解しました/ })
    );

    expect(deleteButton()).toBeEnabled();
  });

  it('deletes a Google account without a password (a sign-in window opens instead)', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const { user } = setup({ method: 'google' });
    expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(deleteButton());

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith({}));
  });

  it('always asks a password account for the password, because the identity is re-checked before deleting', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const { user } = setup({ method: 'password' });

    await user.click(screen.getByRole('checkbox'));
    expect(deleteButton()).toBeDisabled();
    await user.type(screen.getByLabelText('パスワード'), 'secret');
    expect(deleteButton()).toBeEnabled();
    await user.click(deleteButton());

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith({ password: 'secret' })
    );
  });

  it('always tells a Google account that a sign-in window will open before deleting', () => {
    setup({ method: 'google' });
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Google のログイン画面'
    );
  });

  it('shows why the deletion failed and stays open', async () => {
    mockedDelete.mockRejectedValue({ code: 'auth/invalid-credential' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { user, onClose } = setup({ method: 'password' });

    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByLabelText('パスワード'), 'wrong');
    await user.click(deleteButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'パスワードが正しくありません'
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(deleteButton()).toBeDisabled();
  });

  it('renders nothing while closed, without inspecting the user', () => {
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'u1' } });
    render(<DeleteAccountDialog open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getReauthMethod).not.toHaveBeenCalled();
  });

  it('explains when only the account deletion could not be finished', async () => {
    mockedDelete.mockRejectedValue(new AccountDeletionIncompleteError());
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = setup({ method: 'google' });

    await user.click(screen.getByRole('checkbox'));
    await user.click(deleteButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データは削除済み'
    );
  });

  it('can be cancelled without deleting anything', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('has no serious accessibility violations', async () => {
    setup({ method: 'password' });
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } })
    ).toHaveNoViolations();
  });
});
