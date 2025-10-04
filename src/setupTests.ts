// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configureAxe, toHaveNoViolations } from 'jest-axe';

// jest-axe のマッチャを登録
expect.extend(toHaveNoViolations);

// axeの設定（必要に応じてルール緩和をここで定義可能）
export const axe = configureAxe({});
