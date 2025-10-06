#!/usr/bin/env node

/**
 * カバレッジ閾値チェックスクリプト
 *
 * 環境変数:
 *   COVERAGE_THRESHOLD: カバレッジの最小値（デフォルト: 30）
 *
 * 使用例:
 *   node scripts/check-coverage.js
 *   COVERAGE_THRESHOLD=50 node scripts/check-coverage.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const SUMMARY_PATH = path.join(__dirname, '../coverage/coverage-summary.json');
const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 30);

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

const linesPct = Number(total.lines?.pct || 0);
const functionsPct = Number(total.functions?.pct || 0);
const statementsPct = Number(total.statements?.pct || 0);
const branchesPct = Number(total.branches?.pct || 0);

// カバレッジレポート表示
console.log('');
console.log('📊 Test Coverage Report');
console.log('═══════════════════════════════════════');
console.log(`Lines:      ${linesPct.toFixed(2)}%`);
console.log(`Functions:  ${functionsPct.toFixed(2)}%`);
console.log(`Statements: ${statementsPct.toFixed(2)}%`);
console.log(`Branches:   ${branchesPct.toFixed(2)}%`);
console.log('═══════════════════════════════════════');
console.log(`Threshold:  ${THRESHOLD}%`);
console.log('');

// 閾値チェック
const metrics = [
  { name: 'Lines', value: linesPct },
  { name: 'Functions', value: functionsPct },
  { name: 'Statements', value: statementsPct },
  { name: 'Branches', value: branchesPct },
];

const failures = metrics.filter((m) => isNaN(m.value) || m.value < THRESHOLD);

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
