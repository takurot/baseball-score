import type { FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';

interface AppCheckOptions {
  siteKey?: string;
  // デバッグトークン（ローカル開発用）。本番ビルドでは無視する。
  debugToken?: string;
  production?: boolean;
}

// reCAPTCHA v3 の site key が設定されている場合のみ App Check を有効にする。
// 未設定なら何もしない（Console 側で強制(enforce)するまでは従来どおり動作する）。
// Firestore を使う前に呼ぶこと。
export const initAppCheck = (
  app: FirebaseApp,
  {
    siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY,
    debugToken = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN,
    production = process.env.NODE_ENV === 'production',
  }: AppCheckOptions = {}
): AppCheck | null => {
  if (!siteKey) return null;
  if (debugToken && !production) {
    (
      globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  return initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
};
