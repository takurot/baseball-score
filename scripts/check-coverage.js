#!/usr/bin/env node

/**
 * カバレッジ閾値チェックスクリプト
 *
 * 環境変数:
 *   COVERAGE_THRESHOLD: カバレッジの最小値（デフォルト: 30）
 *   COVERAGE_SUMMARY_PATH: coverage-summary.json のパス
 *     （デフォルト: <repo>/coverage/coverage-summary.json、テスト用）
 *
 * 使用例:
 *   node scripts/check-coverage.js
 *   COVERAGE_THRESHOLD=50 node scripts/check-coverage.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const SUMMARY_PATH = process.env.COVERAGE_SUMMARY_PATH
  ? path.resolve(process.env.COVERAGE_SUMMARY_PATH)
  : path.join(__dirname, '../coverage/coverage-summary.json');

const rawThreshold = process.env.COVERAGE_THRESHOLD?.trim() || '30';
const THRESHOLD = Number(rawThreshold);

if (!Number.isFinite(THRESHOLD) || THRESHOLD < 0) {
  console.error(
    `❌ Invalid COVERAGE_THRESHOLD: "${rawThreshold}" (must be a non-negative number)`
  );
  process.exit(1);
}

// カバレッジサマリーファイルの存在確認
if (!fs.existsSync(SUMMARY_PATH)) {
  console.error(`❌ Coverage summary not found: ${SUMMARY_PATH}`);
  console.error('');
  console.error('Please run tests with coverage first:');
  console.error('  npm test -- --coverage --watchAll=false');
  process.exit(1);
}

// カバレッジデータの読み込み
let summary;
try {
  const data = fs.readFileSync(SUMMARY_PATH, 'utf8');
  summary = JSON.parse(data);
} catch (error) {
  console.error(`❌ Failed to read coverage summary: ${error.message}`);
  process.exit(1);
}

// カバレッジ値の取得
const total = summary.total;
if (!total) {
  console.error('❌ Coverage data format error: "total" not found');
  process.exit(1);
}

// カバレッジ値の取得と検証
const metricSources = [
  ['Lines', total.lines],
  ['Functions', total.functions],
  ['Statements', total.statements],
  ['Branches', total.branches],
];

const metrics = metricSources.map(([name, data]) => {
  const value = Number(data?.pct);
  if (!Number.isFinite(value)) {
    console.error(
      `❌ Invalid coverage data: ${name} pct is not a number (got: ${data?.pct})`
    );
    process.exit(1);
  }
  return { name, value };
});

// カバレッジレポート表示
console.log('');
console.log('📊 Test Coverage Report');
console.log('═══════════════════════════════════════');
metrics.forEach((m) => {
  console.log(`${m.name}:`.padEnd(12) + `${m.value.toFixed(2)}%`);
});
console.log('═══════════════════════════════════════');
console.log(`Threshold:  ${THRESHOLD}%`);
console.log('');

// 閾値チェック
const failures = metrics.filter((m) => m.value < THRESHOLD);

if (failures.length > 0) {
  console.error('❌ Coverage Check Failed');
  console.error('');
  console.error('The following metrics are below the threshold:');
  failures.forEach((f) => {
    console.error(
      `  - ${f.name}: ${f.value.toFixed(2)}% (required: ${THRESHOLD}%)`
    );
  });
  console.error('');
  console.error('Detailed report:');
  console.error(JSON.stringify(total, null, 2));
  console.error('');
  process.exit(1);
}

// 成功
console.log('✅ Coverage Check Passed');
console.log('');
console.log('All metrics meet or exceed the threshold!');
console.log('');
process.exit(0);
