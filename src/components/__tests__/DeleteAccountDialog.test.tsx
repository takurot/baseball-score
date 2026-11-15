import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import DeleteAccountDialog from '../DeleteAccountDialog';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteAccount,
  getReauthMethod,
  needsReauthentication,
} from '../../firebase/accountService';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../firebase/accountService', () => ({
  deleteAccount: jest.fn(),
  getReauthMethod: jest.fn(),
  needsReauthentication: jest.fn(),
}));

const mockedDelete = deleteAccount as jest.Mock;

const setup = ({
  method = 'google',
  reauth = false,
}: { method?: string; reauth?: boolean } = {}) => {
  (useAuth as jest.Mock).mockReturnValue({
    currentUser: { uid: 'u1', email: 'me@example.com' },
  });
  (getReauthMethod as jest.Mock).mockReturnValue(method);
  (needsReauthentication as jest.Mock).mockReturnValue(reauth);
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

  it('deletes without asking for a password when no re-authentication is needed', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const { user } = setup({ method: 'password', reauth: false });
    expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(deleteButton());

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith({}));
  });

  it('asks a password account for the password only when re-authentication is needed', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const { user } = setup({ method: 'password', reauth: true });

    await user.click(screen.getByRole('checkbox'));
    expect(deleteButton()).toBeDisabled();
    await user.type(screen.getByLabelText('パスワード'), 'secret');
    expect(deleteButton()).toBeEnabled();
    await user.click(deleteButton());

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith({ password: 'secret' })
    );
  });

  it('tells a Google account that a sign-in window will open when re-authentication is needed', () => {
    setup({ method: 'google', reauth: true });
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Google のログイン画面'
    );
  });

  it('shows why the deletion failed and stays open', async () => {
    mockedDelete.mockRejectedValue({ code: 'auth/invalid-credential' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { user, onClose } = setup({ method: 'password', reauth: true });

    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByLabelText('パスワード'), 'wrong');
    await user.click(deleteButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'パスワードが正しくありません'
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(deleteButton()).toBeDisabled();
  });

  it('can be cancelled without deleting anything', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('has no serious accessibility violations', async () => {
    setup({ method: 'password', reauth: true });
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } })
    ).toHaveNoViolations();
  });
});
