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

  analyticsInstance = module.getAnalytics(app);
  return analyticsInstance;
};

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

    module.logEvent(instance, eventName, eventParams);
  } catch (error) {
    console.warn('Analytics event skipped:', error);
  }
};
