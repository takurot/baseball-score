import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
  registerWithEmailAndPassword,
  getAuthErrorMessage,
} from '../authService';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../config', () => ({ app: {} }));

const mockedCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockedUpdateProfile = updateProfile as jest.Mock;

describe('registerWithEmailAndPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateProfile 後に reload して最新のユーザー情報を返す', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    const user = { uid: 'u1', displayName: null, reload };
    mockedCreateUser.mockResolvedValue({ user });
    mockedUpdateProfile.mockResolvedValue(undefined);

    const result = await registerWithEmailAndPassword(
      'a@example.com',
      'password123',
      '山田太郎'
    );

    expect(mockedUpdateProfile).toHaveBeenCalledWith(user, {
      displayName: '山田太郎',
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result).toBe(user);
  });

  test('表示名が空の場合は updateProfile も reload も呼ばない', async () => {
    const reload = jest.fn();
    const user = { uid: 'u1', displayName: null, reload };
    mockedCreateUser.mockResolvedValue({ user });

    await registerWithEmailAndPassword('a@example.com', 'password123', '');

    expect(mockedUpdateProfile).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('getAuthErrorMessage', () => {
  test('既知のエラーコードに対応するメッセージを返す', () => {
    const message = getAuthErrorMessage(
      { code: 'auth/user-not-found' },
      { 'auth/user-not-found': 'アカウントが見つかりません' },
      'デフォルトメッセージ'
    );
    expect(message).toBe('アカウントが見つかりません');
  });

  test('未知のエラーコードにはフォールバックを返す', () => {
    const message = getAuthErrorMessage(
      { code: 'auth/unknown-error' },
      { 'auth/user-not-found': 'アカウントが見つかりません' },
      'デフォルトメッセージ'
    );
    expect(message).toBe('デフォルトメッセージ');
  });

  test('code を持たない例外（Error インスタンスでない場合も含む）はフォールバックを返す', () => {
    expect(
      getAuthErrorMessage('network down', {}, 'デフォルトメッセージ')
    ).toBe('デフォルトメッセージ');
    expect(getAuthErrorMessage(null, {}, 'デフォルトメッセージ')).toBe(
      'デフォルトメッセージ'
    );
  });
});
