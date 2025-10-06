#!/usr/bin/env node

/**
 * バンドルサイズチェックスクリプト
 *
 * 環境変数:
 *   MAX_BUNDLE_SIZE_MB: バンドルサイズの最大値（MB単位、デフォルト: 1）
 *
 * 使用例:
 *   node scripts/check-bundle-size.js
 *   MAX_BUNDLE_SIZE_MB=2 node scripts/check-bundle-size.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const BUILD_DIR = path.join(__dirname, '../build/static/js');
const MAX_SIZE_MB = Number(process.env.MAX_BUNDLE_SIZE_MB || 1);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// buildディレクトリの存在確認
if (!fs.existsSync(BUILD_DIR)) {
  console.error(`❌ Build directory not found: ${BUILD_DIR}`);
  console.error('');
  console.error('Please run build first:');
  console.error('  npm run build');
  process.exit(1);
}

// JSファイルの取得（.mapファイルを除外）
let files;
try {
  files = fs
    .readdirSync(BUILD_DIR)
    .filter((file) => file.endsWith('.js') && !file.includes('.map'));
} catch (error) {
  console.error(`❌ Failed to read build directory: ${error.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`❌ No JavaScript files found in ${BUILD_DIR}`);
  process.exit(1);
}

// メインバンドルの特定
const mainBundle = files.find((file) => file.startsWith('main.'));
if (!mainBundle) {
  console.error('❌ Main bundle not found');
  console.error(`Available files: ${files.join(', ')}`);
  process.exit(1);
}

// ファイルサイズの取得
let size;
try {
  const filePath = path.join(BUILD_DIR, mainBundle);
  const stats = fs.statSync(filePath);
  size = stats.size;
} catch (error) {
  console.error(`❌ Failed to get file size: ${error.message}`);
  process.exit(1);
}

// サイズレポート表示
const sizeKB = (size / 1024).toFixed(2);
const sizeMB = (size / (1024 * 1024)).toFixed(2);
const maxMB = MAX_SIZE_MB.toFixed(2);
const usagePercent = ((size / MAX_SIZE_BYTES) * 100).toFixed(1);

console.log('');
console.log('📦 Bundle Size Report');
console.log('═══════════════════════════════════════');
console.log(`Main bundle: ${mainBundle}`);
console.log(`Size:        ${sizeKB} KB (${sizeMB} MB)`);
console.log(`Limit:       ${(MAX_SIZE_BYTES / 1024).toFixed(2)} KB (${maxMB} MB)`);
console.log(`Usage:       ${usagePercent}%`);
console.log('═══════════════════════════════════════');
console.log('');

// 全ファイルのサイズ表示
console.log('📊 All JavaScript files:');
files.forEach((file) => {
  const filePath = path.join(BUILD_DIR, file);
  const fileSize = fs.statSync(filePath).size;
  const fileKB = (fileSize / 1024).toFixed(2);
  console.log(`  - ${file}: ${fileKB} KB`);
});
console.log('');

// サイズチェック
if (size > MAX_SIZE_BYTES) {
  console.error('❌ Bundle Size Check Failed');
  console.error('');
  console.error(
    `Main bundle size ${sizeKB} KB exceeds limit ${(MAX_SIZE_BYTES / 1024).toFixed(2)} KB`
  );
  console.error('');
  console.error('Suggestions to reduce bundle size:');
  console.error('  1. Use code splitting (React.lazy)');
  console.error('  2. Analyze bundle with source-map-explorer');
  console.error('  3. Remove unused dependencies');
  console.error('  4. Enable tree shaking');
  console.error('');
  process.exit(1);
}

// 成功
console.log('✅ Bundle Size Check Passed');
console.log('');
console.log(`Main bundle size is within the limit (${usagePercent}% of ${maxMB} MB)`);
console.log('');
process.exit(0);

