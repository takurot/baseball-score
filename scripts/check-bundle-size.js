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

const DEFAULT_MAX_SIZE_MB = 1;

// MAX_BUNDLE_SIZE_MB を検証してMB値を返す。未設定ならデフォルト値、
// 数値化できない・0以下の場合は分かりやすいエラーメッセージ付きで例外を投げる
function parseMaxSizeMB(rawValue) {
  if (rawValue === undefined || rawValue === '') {
    return DEFAULT_MAX_SIZE_MB;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Invalid MAX_BUNDLE_SIZE_MB: "${rawValue}" (must be a positive number)`
    );
  }

  return value;
}

// ビルド成果物の JS ファイルのみを抽出する（.js.map 等は対象外。
// 旧実装の !file.includes('.map') は .endsWith('.js') と重複な上、
// "map" を含む正当なファイル名（例: map-utils.abc123.chunk.js）まで
// 誤って除外してしまうため削除した）
function filterJsFiles(files) {
  return files.filter((file) => file.endsWith('.js'));
}

// メインバンドルを特定する。CRA の命名規則（main.<hash>.js）に依存するため、
// 複数該当した場合はどれを採用したか分かるよう candidates を返す
function findMainBundle(files) {
  const candidates = files.filter((file) => file.startsWith('main.'));
  return { mainBundle: candidates[0] ?? null, candidates };
}

// ファイルサイズを取得する。取得できない場合は例外を投げずに null を返し、
// 呼び出し側でその1件だけをスキップできるようにする（レポート全体を失わない）
function getFileSizeSafe(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return null;
  }
}

function main() {
  const BUILD_DIR = path.join(__dirname, '../build/static/js');

  let maxSizeMB;
  try {
    maxSizeMB = parseMaxSizeMB(process.env.MAX_BUNDLE_SIZE_MB);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`❌ Build directory not found: ${BUILD_DIR}`);
    console.error('');
    console.error('Please run build first:');
    console.error('  npm run build');
    process.exit(1);
  }

  let files;
  try {
    files = filterJsFiles(fs.readdirSync(BUILD_DIR));
  } catch (error) {
    console.error(`❌ Failed to read build directory: ${error.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`❌ No JavaScript files found in ${BUILD_DIR}`);
    process.exit(1);
  }

  const { mainBundle, candidates } = findMainBundle(files);
  if (!mainBundle) {
    console.error('❌ Main bundle not found');
    console.error(`Available files: ${files.join(', ')}`);
    process.exit(1);
  }
  if (candidates.length > 1) {
    console.warn(
      `⚠️  Multiple main bundle candidates found, using "${mainBundle}": ${candidates.join(', ')}`
    );
  }

  const mainSize = getFileSizeSafe(path.join(BUILD_DIR, mainBundle));
  if (mainSize === null) {
    console.error(`❌ Failed to get file size for ${mainBundle}`);
    process.exit(1);
  }

  const sizeKB = (mainSize / 1024).toFixed(2);
  const sizeMB = (mainSize / (1024 * 1024)).toFixed(2);
  const maxMB = maxSizeMB.toFixed(2);
  const usagePercent = ((mainSize / maxSizeBytes) * 100).toFixed(1);

  console.log('');
  console.log('📦 Bundle Size Report');
  console.log('═══════════════════════════════════════');
  console.log(`Main bundle: ${mainBundle}`);
  console.log(`Size:        ${sizeKB} KB (${sizeMB} MB)`);
  console.log(
    `Limit:       ${(maxSizeBytes / 1024).toFixed(2)} KB (${maxMB} MB)`
  );
  console.log(`Usage:       ${usagePercent}%`);
  console.log('═══════════════════════════════════════');
  console.log('');

  // 全ファイルのサイズ表示（読み取れないファイルがあってもレポート全体は続行する）
  console.log('📊 All JavaScript files:');
  let totalSize = 0;
  files.forEach((file) => {
    const fileSize = getFileSizeSafe(path.join(BUILD_DIR, file));
    if (fileSize === null) {
      console.log(`  - ${file}: (failed to read size)`);
      return;
    }
    totalSize += fileSize;
    const fileKB = (fileSize / 1024).toFixed(2);
    console.log(`  - ${file}: ${fileKB} KB`);
  });
  const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log('');
  console.log(
    `Total JS size (all chunks, including async): ${(totalSize / 1024).toFixed(2)} KB (${totalMB} MB)`
  );
  console.log(
    '  Note: only the main bundle above is enforced against the limit;'
  );
  console.log('  async chunks are reported here for visibility only.');
  console.log('');

  if (mainSize > maxSizeBytes) {
    console.error('❌ Bundle Size Check Failed');
    console.error('');
    console.error(
      `Main bundle size ${sizeKB} KB exceeds limit ${(maxSizeBytes / 1024).toFixed(2)} KB`
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

  console.log('✅ Bundle Size Check Passed');
  console.log('');
  console.log(
    `Main bundle size is within the limit (${usagePercent}% of ${maxMB} MB)`
  );
  console.log('');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseMaxSizeMB,
  filterJsFiles,
  findMainBundle,
  getFileSizeSafe,
};
