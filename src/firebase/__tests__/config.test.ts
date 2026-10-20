import { getAuthDomain } from '../config';

describe('getAuthDomain', () => {
  const originalEnv = process.env;
  const originalLocation = window.location;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      REACT_APP_FIREBASE_AUTH_DOMAIN: 'default.firebaseapp.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  const setHostname = (hostname: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = new URL(`https://${hostname}`);
  };

  test('Firebase Hosting (*.web.app) の場合は現在のホスト名を返す', () => {
    setHostname('baseball-score-app.web.app');
    expect(getAuthDomain()).toBe('baseball-score-app.web.app');
  });

  test('Firebase Hosting (*.firebaseapp.com) の場合は現在のホスト名を返す', () => {
    setHostname('baseball-score-app.firebaseapp.com');
    expect(getAuthDomain()).toBe('baseball-score-app.firebaseapp.com');
  });

  test('localhost の場合は環境変数の authDomain を返す', () => {
    setHostname('localhost');
    expect(getAuthDomain()).toBe('default.firebaseapp.com');
  });

  test('127.0.0.1 の場合は環境変数の authDomain を返す', () => {
    setHostname('127.0.0.1');
    expect(getAuthDomain()).toBe('default.firebaseapp.com');
  });

  test('カスタムドメインで REACT_APP_USE_CURRENT_ORIGIN_FOR_AUTH が true の場合はホスト名を返す', () => {
    setHostname('score.example.com');
    process.env.REACT_APP_USE_CURRENT_ORIGIN_FOR_AUTH = 'true';
    expect(getAuthDomain()).toBe('score.example.com');
  });

  test('その他の通常ドメインでは環境変数の authDomain を返す', () => {
    setHostname('example.com');
    delete process.env.REACT_APP_USE_CURRENT_ORIGIN_FOR_AUTH;
    expect(getAuthDomain()).toBe('default.firebaseapp.com');
  });
});
