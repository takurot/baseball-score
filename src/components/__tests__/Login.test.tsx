import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;

describe('Login component - Google Sign In', () => {
  const mockSignIn = jest.fn();
  const mockLoginWithEmailAndPassword = jest.fn();
  const mockRegisterWithEmailAndPassword = jest.fn();
  const mockSendPasswordReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      signIn: mockSignIn,
      loginWithEmailAndPassword: mockLoginWithEmailAndPassword,
      registerWithEmailAndPassword: mockRegisterWithEmailAndPassword,
      sendPasswordReset: mockSendPasswordReset,
    });
  });

  test('Googleログイン成功時はエラーが表示されない', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ uid: 'user123' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('ポップアップをユーザーが閉じた場合 (auth/popup-closed-by-user) に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ログインがキャンセルされました（ウィンドウが閉じられました）'
    );
    expect(googleButton).toBeEnabled();
  });

  test('ポップアップがブラウザにブロックされた場合 (auth/popup-blocked) に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/popup-blocked' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください'
    );
    expect(googleButton).toBeEnabled();
  });

  test('未許可ドメインエラー (auth/unauthorized-domain) の場合に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/unauthorized-domain' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'このドメインからのログインは許可されていません（Firebaseの設定をご確認ください）'
    );
  });

  test('プロバイダ無効エラー (auth/operation-not-allowed) の場合に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/operation-not-allowed' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Googleログインが有効になっていません（Firebaseの設定をご確認ください）'
    );
  });

  test('ネットワークエラー (auth/network-request-failed) の場合に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ネットワークエラーが発生しました。接続を確認して再度お試しください'
    );
  });

  test('内部エラー (auth/internal-error) の場合に適切なメッセージを表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/internal-error' });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      '認証サービスで内部エラーが発生しました。しばらく時間をおいて再度お試しください'
    );
  });

  test('未知のエラーの場合はデフォルトのエラーメッセージを表示し再試行できる', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce(new Error('Unknown failure'));

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Googleログインに失敗しました。もう一度お試しください。'
    );
    expect(googleButton).toBeEnabled();

    // 再試行して成功
    mockSignIn.mockResolvedValueOnce({ uid: 'user123' });
    await user.click(googleButton);
    expect(mockSignIn).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  test('新規登録タブの「Googleで登録」でも同様にエラーハンドリングが行われる', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

    render(<Login />);
    const registerTab = screen.getByRole('tab', { name: '新規登録' });
    await user.click(registerTab);

    const googleRegisterButton = screen.getByRole('button', {
      name: 'Googleで登録',
    });
    await user.click(googleRegisterButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ログインがキャンセルされました（ウィンドウが閉じられました）'
    );
  });

  test('認証ステート欠落エラー (auth/missing-or-invalid-nonce) の場合にモバイルSafari向けの対処案内を表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({
      code: 'auth/missing-or-invalid-nonce',
    });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      '認証ステートの確認に失敗しました。iPhone/Safariをお使いの場合はプライベートブラウズを解除するか、メールアドレスでのログイン・新規登録をお試しください'
    );
  });

  test('ストレージ非対応エラー (auth/web-storage-unsupported) の場合にプライベートブラウズ解除の案内を表示する', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValueOnce({
      code: 'auth/web-storage-unsupported',
    });

    render(<Login />);
    const googleButton = screen.getByRole('button', {
      name: 'Googleでログイン',
    });
    await user.click(googleButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ブラウザのストレージ機能が無効になっています。プライベートブラウズを解除するかCookieを許可してください'
    );
  });

  test('新規登録・ログイン画面にメールアドレス登録の推奨・案内注記が表示される', () => {
    render(<Login />);
    expect(
      screen.getByText(
        /※ iPhone\/Safari 等で Google ログイン・登録ができない場合は、メールアドレスでのご利用をおすすめします。/
      )
    ).toBeInTheDocument();
  });
});
