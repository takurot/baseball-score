#!/usr/bin/env node

/**
 * 本番用 CSP 適用スクリプト
 *
 * public/index.html の Content-Security-Policy meta タグは、CRA の開発サーバー
 * (npm start) を動かすために 'unsafe-inline' や localhost 宛の接続先を含んでいる。
 * このファイルはビルド時にそのまま build/index.html へコピーされるため、
 * 何もしなければ本番ビルドにも開発用の緩い CSP がそのまま同梱されてしまう。
 *
 * firebase.json の hosting.headers で配信される CSP レスポンスヘッダーは
 * 厳格な値になっているが、Firebase Hosting 以外の経路（他のホスティング、
 * プレビュー環境、`serve -s build` でのローカル確認など）で配信された場合は
 * このヘッダーが付与されず、HTML に埋め込まれた緩い CSP がそのまま有効に
 * なってしまう。
 *
 * このスクリプトは `npm run build` の後に実行し、firebase.json に定義された
 * 本番用 CSP を唯一の情報源として build/index.html の meta タグへ反映する。
 *
 * 使用例:
 *   node scripts/apply-production-csp.js
 */

const fs = require('fs');
const path = require('path');

const FIREBASE_CONFIG_PATH = path.join(__dirname, '../firebase.json');
const BUILD_INDEX_PATH = path.join(__dirname, '../build/index.html');

const CSP_META_PATTERN =
  /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)("\s*\/>)/;

/**
 * firebase.json の hosting.headers から "**" ルール向けの
 * Content-Security-Policy ヘッダー値を取り出す。
 * @param {unknown} firebaseConfig
 * @returns {string}
 */
function extractProductionCsp(firebaseConfig) {
  const headerGroups = firebaseConfig?.hosting?.headers;
  if (!Array.isArray(headerGroups)) {
    throw new Error('firebase.json: hosting.headers が見つかりません');
  }

  const globalHeaders = headerGroups.find(
    (group) => group.source === '**'
  )?.headers;
  if (!Array.isArray(globalHeaders)) {
    throw new Error(
      'firebase.json: source "**" 向けの headers が見つかりません'
    );
  }

  const csp = globalHeaders.find(
    (header) => header.key === 'Content-Security-Policy'
  )?.value;
  if (!csp) {
    throw new Error(
      'firebase.json: Content-Security-Policy ヘッダーが見つかりません'
    );
  }

  return csp;
}

/**
 * build/index.html の CSP meta タグの content を、本番用 CSP に差し替える。
 * @param {string} html
 * @param {string} productionCsp
 * @returns {string}
 */
function applyProductionCspToHtml(html, productionCsp) {
  if (!CSP_META_PATTERN.test(html)) {
    throw new Error(
      'build/index.html: Content-Security-Policy meta タグが見つかりません'
    );
  }

  return html.replace(CSP_META_PATTERN, `$1${productionCsp}$3`);
}

function main() {
  if (!fs.existsSync(BUILD_INDEX_PATH)) {
    console.error(`❌ Build output not found: ${BUILD_INDEX_PATH}`);
    console.error('先に `npm run build` を実行してください');
    process.exit(1);
  }

  let firebaseConfig;
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to read firebase.json: ${error.message}`);
    process.exit(1);
    return;
  }

  let productionCsp;
  try {
    productionCsp = extractProductionCsp(firebaseConfig);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
    return;
  }

  const originalHtml = fs.readFileSync(BUILD_INDEX_PATH, 'utf8');

  let updatedHtml;
  try {
    updatedHtml = applyProductionCspToHtml(originalHtml, productionCsp);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
    return;
  }

  fs.writeFileSync(BUILD_INDEX_PATH, updatedHtml);

  console.log('✅ build/index.html の CSP を本番用の厳格な値に更新しました');
}

if (require.main === module) {
  main();
}

module.exports = { extractProductionCsp, applyProductionCspToHtml };
