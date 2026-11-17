import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { initAppCheck } from '../appCheck';

jest.mock('firebase/app-check', () => ({
  initializeAppCheck: jest.fn(),
  ReCaptchaV3Provider: jest.fn(),
}));

const app = { name: 'test-app' } as never;
const mockedInit = initializeAppCheck as jest.Mock;
const mockedProvider = ReCaptchaV3Provider as unknown as jest.Mock;

describe('initAppCheck', () => {
  afterEach(() => {
    delete (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
      .FIREBASE_APPCHECK_DEBUG_TOKEN;
  });

  it('does nothing when no site key is configured', () => {
    expect(initAppCheck(app, { siteKey: undefined })).toBeNull();
    expect(initAppCheck(app, { siteKey: '' })).toBeNull();
    expect(mockedInit).not.toHaveBeenCalled();
  });

  it('registers reCAPTCHA v3 with automatic token refresh when a site key is set', () => {
    mockedInit.mockReturnValue('APP_CHECK');
    const instance = { provider: 'PROVIDER' };
    mockedProvider.mockImplementation(() => instance);

    expect(initAppCheck(app, { siteKey: 'site-key' })).toBe('APP_CHECK');
    expect(mockedProvider).toHaveBeenCalledWith('site-key');
    expect(mockedInit).toHaveBeenCalledWith(app, {
      provider: instance,
      isTokenAutoRefreshEnabled: true,
    });
  });

  it('uses a debug token outside production only', () => {
    initAppCheck(app, {
      siteKey: 'site-key',
      debugToken: 'debug-token',
      production: false,
    });
    expect(
      (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
        .FIREBASE_APPCHECK_DEBUG_TOKEN
    ).toBe('debug-token');
  });

  it('ignores a debug token in production builds', () => {
    initAppCheck(app, {
      siteKey: 'site-key',
      debugToken: 'debug-token',
      production: true,
    });
    expect(
      (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
        .FIREBASE_APPCHECK_DEBUG_TOKEN
    ).toBeUndefined();
  });
});
