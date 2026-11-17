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

  test('ストレージ非対応エラー (auth/web-storage-unsupported) の場合にプライベートブラウズ解除の案内を表示する (Googleログイン)', async () => {
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

  test('メールログイン時にストレージ非対応エラー (auth/web-storage-unsupported) が発生した場合に対処案内を表示する', async () => {
    const user = userEvent.setup();
    mockLoginWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/web-storage-unsupported',
    });

    render(<Login />);
    await user.type(
      screen.getByLabelText(/メールアドレス/i),
      'test@example.com'
    );
    await user.type(screen.getByLabelText(/^パスワード/i), 'password123');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'ブラウザのストレージ機能が無効になっています。プライベートブラウズを解除するかCookieを許可してください'
    );
  });

  test('新規ユーザー登録時にストレージ非対応エラー (auth/web-storage-unsupported) が発生した場合に対処案内を表示する', async () => {
    const user = userEvent.setup();
    mockRegisterWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/web-storage-unsupported',
    });

    render(<Login />);
    const registerTab = screen.getByRole('tab', { name: '新規登録' });
    await user.click(registerTab);

    await user.type(
      screen.getByLabelText(/メールアドレス/i),
      'new@example.com'
    );
    await user.type(screen.getByLabelText(/^パスワード/i), 'password123');
    await user.click(screen.getByRole('button', { name: 'アカウントを作成' }));

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

describe('Login component - password reset', () => {
  const mockSendPasswordReset = jest.fn();
  const SENT =
    'パスワードリセットのリンクを送信しました。メールを確認してください';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      signIn: jest.fn(),
      loginWithEmailAndPassword: jest.fn(),
      registerWithEmailAndPassword: jest.fn(),
      sendPasswordReset: mockSendPasswordReset,
    });
  });

  const requestReset = async (email: string) => {
    const user = userEvent.setup();
    render(<Login />);
    await user.click(
      screen.getByRole('button', { name: 'パスワードをお忘れですか？' })
    );
    await user.type(screen.getByLabelText('メールアドレス'), email);
    await user.click(
      screen.getByRole('button', { name: 'パスワードをリセット' })
    );
  };

  test('送信に成功するとリンクを送信した旨を表示する', async () => {
    mockSendPasswordReset.mockResolvedValueOnce(undefined);
    await requestReset('known@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(SENT);
    expect(mockSendPasswordReset).toHaveBeenCalledWith('known@example.com');
  });

  test('未登録のメールアドレスでも、登録済みと同じ送信完了メッセージを表示し存在を示さない', async () => {
    mockSendPasswordReset.mockRejectedValueOnce({
      code: 'auth/user-not-found',
    });
    await requestReset('unknown@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(SENT);
    expect(alert).not.toHaveTextContent('見つかりません');
    expect(alert).not.toHaveTextContent('アカウント');
  });

  test('形式が不正なメールアドレスはその旨を表示する（存在の有無は漏れない）', async () => {
    mockSendPasswordReset.mockRejectedValueOnce({ code: 'auth/invalid-email' });
    await requestReset('not-an-email');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '有効なメールアドレスを入力してください'
    );
  });

  test('ネットワークなどの失敗は送信完了と誤認させず、失敗として表示する', async () => {
    mockSendPasswordReset.mockRejectedValueOnce({
      code: 'auth/network-request-failed',
    });
    await requestReset('known@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('送信しました');
  });
});

describe('Login component - email login with enumeration protection', () => {
  test('メール列挙保護が有効なときの auth/invalid-credential も、同じ汎用メッセージで表示する', async () => {
    const user = userEvent.setup();
    const mockLogin = jest.fn().mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    });
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      signIn: jest.fn(),
      loginWithEmailAndPassword: mockLogin,
      registerWithEmailAndPassword: jest.fn(),
      sendPasswordReset: jest.fn(),
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Login />);

    await user.type(
      screen.getAllByLabelText('メールアドレス')[0],
      'a@example.com'
    );
    await user.type(screen.getByLabelText('パスワード'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'メールアドレスまたはパスワードが正しくありません'
    );
  });
});
