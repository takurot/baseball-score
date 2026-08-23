#!/usr/bin/env node

/**
 * .codex/agents/*.toml の model スラッグ整合性チェック
 *
 * 各エージェント設定ファイルの `model = "..."` が独立して重複定義されており、
 * 更新時に1箇所だけ変更されて食い違う（例: gpt-5.4 のまま他だけ上がる）のを防ぐ。
 * TOML パーサを追加せず、行単位の正規表現で `model = "..."` を抽出する
 * （このスクリプトの用途にはそれで十分）。
 *
 * 使用例:
 *   node scripts/check-codex-model-consistency.js
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '../.codex/agents');
const MODEL_LINE_PATTERN = /^\s*model\s*=\s*"([^"]+)"/m;

// 1ファイル分の内容から model スラッグを抽出する。見つからない場合は null
function extractModel(fileContents) {
  const match = fileContents.match(MODEL_LINE_PATTERN);
  return match ? match[1] : null;
}

// agents ディレクトリ内の .toml ファイルそれぞれの model スラッグを集計する
function collectAgentModels(agentsDir) {
  const files = fs
    .readdirSync(agentsDir)
    .filter((file) => file.endsWith('.toml'))
    .sort();

  return files.map((file) => {
    const contents = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    return { file, model: extractModel(contents) };
  });
}

// 収集結果を検証し、問題点のメッセージ配列を返す（空配列なら OK）
function validateAgentModels(entries) {
  const problems = [];

  entries.forEach(({ file, model }) => {
    if (!model) {
      problems.push(`${file}: no "model = ..." line found`);
    }
  });

  const distinctModels = [
    ...new Set(entries.map((e) => e.model).filter(Boolean)),
  ];
  if (distinctModels.length > 1) {
    const detail = entries
      .filter((e) => e.model)
      .map((e) => `${e.file}=${e.model}`)
      .join(', ');
    problems.push(`Inconsistent model slugs across agents: ${detail}`);
  }

  return problems;
}

function main() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error(`❌ Agents directory not found: ${AGENTS_DIR}`);
    process.exit(1);
  }

  const entries = collectAgentModels(AGENTS_DIR);
  if (entries.length === 0) {
    console.error(`❌ No .toml files found in ${AGENTS_DIR}`);
    process.exit(1);
  }

  const problems = validateAgentModels(entries);

  console.log('');
  console.log('🤖 Codex agent model consistency');
  console.log('═══════════════════════════════════════');
  entries.forEach(({ file, model }) => {
    console.log(`  - ${file}: ${model ?? '(missing)'}`);
  });
  console.log('═══════════════════════════════════════');
  console.log('');

  if (problems.length > 0) {
    console.error('❌ Codex agent model consistency check failed');
    console.error('');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('');
    process.exit(1);
  }

  console.log('✅ All agent model slugs are consistent');
  console.log('');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { extractModel, collectAgentModels, validateAgentModels };
