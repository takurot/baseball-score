import { getAuthErrorMessage } from '../authErrorMessage';

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
