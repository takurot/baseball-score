import type { Analytics } from 'firebase/analytics';
import { app } from './config';

type FirebaseAnalyticsModule = typeof import('firebase/analytics');

let analyticsInstance: Analytics | null = null;
let analyticsModulePromise: Promise<FirebaseAnalyticsModule | null> | null =
  null;

const loadAnalyticsModule =
  async (): Promise<FirebaseAnalyticsModule | null> => {
    if (analyticsModulePromise) {
      return analyticsModulePromise;
    }

    analyticsModulePromise = (async () => {
      if (typeof window === 'undefined') {
        return null;
      }

      try {
        const module = await import('firebase/analytics');
        if (module.isSupported) {
          const supported = await module.isSupported();
          if (!supported) {
            console.warn(
              'Firebase Analytics is not supported in this environment.'
            );
            return null;
          }
        }
        return module;
      } catch (error) {
        console.warn('Firebase Analytics failed to load:', error);
        return null;
      }
    })();

    return analyticsModulePromise;
  };

const loadAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  const module = await loadAnalyticsModule();
  if (!module) {
    return null;
  }

  try {
    // 共有URLの ?gameId=... など、ページURLのクエリは自動計測でイベントごとに送られ
    // てしまう。IDは公開試合の閲覧用アクセスキーなので、クエリ・リファラー・自動の
    // page_view を送らない設定で初期化する（page_view は必要な箇所で明示的に送る）。
    analyticsInstance = module.initializeAnalytics(app, {
      config: {
        page_location: `${window.location.origin}${window.location.pathname}`,
        page_referrer: '',
        send_page_view: false,
      },
    });
  } catch {
    // すでに初期化されている場合は既存のインスタンスを使う
    analyticsInstance = module.getAnalytics(app);
  }
  return analyticsInstance;
};

// 送ってよいパラメータは、ここに列挙した固定値・種別・回数だけ（許可リスト）。
// チーム名・選手名・試合タイトル・メモ・試合ID・メールアドレスなど、個人や試合を
// 識別し得る情報は、呼び出し側の誤りで混入しても送信の直前でここで取り除く。
// 新しいパラメータを送るときは、識別性が無いことを確認してここに追加する。
const ALLOWED_PARAM_KEYS = new Set([
  'mode',
  'screen',
  'page_title',
  'run_type',
  'run_count',
  'out_type',
  'inning',
]);

const onlyAllowedParams = (
  params?: Record<string, any>
): Record<string, any> | undefined =>
  params &&
  Object.fromEntries(
    Object.entries(params).filter(([key]) => ALLOWED_PARAM_KEYS.has(key))
  );

export const logAnalyticsEvent = async (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  try {
    const module = await loadAnalyticsModule();
    const instance = await loadAnalyticsInstance();

    if (!module || !instance) {
      return;
    }

    module.logEvent(instance, eventName, onlyAllowedParams(eventParams));
  } catch (error) {
    console.warn('Analytics event skipped:', error);
  }
};
