import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Web Vitalsの計測を開始
// 開発環境ではコンソールにログ出力
// 本番環境では分析サービスへの送信準備（reportWebVitals.ts参照）
reportWebVitals((metric) => {
  // 開発環境ではreportWebVitals内でログ出力されるため、ここでは何もしない
  // 本番環境では、ここでメトリクスを集約してバッチ送信することも可能
});
