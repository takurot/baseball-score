import type { Metric } from 'web-vitals';

/**
 * Web Vitals レポート機能
 *
 * Core Web Vitalsとその他の重要なメトリクスを計測し、
 * コンソールに出力します。本番環境では分析サービス（Google Analytics等）に送信可能。
 *
 * 計測メトリクス:
 * - CLS (Cumulative Layout Shift): レイアウトの安定性
 * - INP (Interaction to Next Paint): インタラクションの応答性（FIDの後継）
 * - FCP (First Contentful Paint): 初回コンテンツ描画
 * - LCP (Largest Contentful Paint): 最大コンテンツ描画
 * - TTFB (Time to First Byte): 最初のバイト受信時間
 *
 * @see https://web.dev/vitals/
 */
const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      const reportMetric = (metric: Metric) => {
        // コールバック関数を実行
        onPerfEntry(metric);

        // TODO: 本番環境ではアナリティクスサービスに送信
        // if (process.env.NODE_ENV === 'production') {
        //   // Google Analytics 4への送信例
        //   if (typeof window !== 'undefined' && (window as any).gtag) {
        //     (window as any).gtag('event', metric.name, {
        //       value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        //       metric_id: metric.id,
        //       metric_value: metric.value,
        //       metric_delta: metric.delta,
        //       metric_rating: metric.rating,
        //     });
        //   }
        // }

        // 開発環境とデバッグ用にコンソール出力
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Web Vitals] ${metric.name}:`, {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigationType: metric.navigationType,
          });
        }
      };

      // 各メトリクスの計測を開始
      onCLS(reportMetric);
      onINP(reportMetric); // FIDの後継メトリクス
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
    });
  }
};

export default reportWebVitals;
