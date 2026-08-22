// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { configureAxe, toHaveNoViolations } from 'jest-axe';

// jest-axe のマッチャを登録
expect.extend(toHaveNoViolations);

// CI 環境（特に Node 16/18 の実行ジョブ）やローカルでの並列テスト実行時は
// Suspense で遅延ロードするコンポーネントを含むテストが既定の 1000ms では
// 間に合わずフレーキーに失敗することがあるため、findBy* / waitFor の
// 既定タイムアウトを緩和する
configure({ asyncUtilTimeout: 8000 });

// axeの設定（必要に応じてルール緩和をここで定義可能）
export const axe = configureAxe({});
