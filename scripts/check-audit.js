#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 既知の上流未修正アドバイザリ（公式パッチ未リリースかつdevDependencies/ビルドツール経由のもの）
// 上流でパッチがリリースされ、依存解決でき次第このリストから削除すること。
const ALLOWED_ADVISORIES = new Set([
  'GHSA-vfj7-8cjw-p6xm', // braces: stack-exhaustion DoS (no upstream patch available as of 2026-10)
]);

function parseArgs(args = process.argv.slice(2)) {
  let auditLevel = 'moderate'; // デフォルトは moderate 以上をブロック
  let reportFile = 'audit-report.json';

  for (const arg of args) {
    if (arg.startsWith('--audit-level=')) {
      auditLevel = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      reportFile = arg;
    }
  }

  return { auditLevel, reportFile };
}

function evaluateAuditReport(report, auditLevel = 'moderate') {
  if (!report) {
    return { success: false, error: 'Empty audit report' };
  }

  if (report.error) {
    return {
      success: false,
      error: `npm audit error: ${report.error.summary || report.error.code || 'unknown'}`,
    };
  }

  const severityOrder = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
    info: 0,
  };
  const threshold = severityOrder[auditLevel] ?? 2;

  const vulnerabilities = report.vulnerabilities || {};
  const ignoredDirect = [];
  const blockingVulnerabilities = [];

  for (const [pkgName, pkgInfo] of Object.entries(vulnerabilities)) {
    const directAdvisories = (pkgInfo.via || []).filter(
      (v) => typeof v !== 'string'
    );

    if (directAdvisories.length > 0) {
      const pkgSeverity = pkgInfo.severity || 'info';
      const pkgScore = severityOrder[pkgSeverity] ?? 0;

      if (pkgScore < threshold) {
        continue;
      }

      const unallowed = directAdvisories.filter((adv) => {
        const ghsa = adv.url ? adv.url.split('/').pop() : null;
        return !ghsa || !ALLOWED_ADVISORIES.has(ghsa);
      });

      if (unallowed.length === 0) {
        ignoredDirect.push({
          pkg: pkgName,
          severity: pkgSeverity,
          advisories: directAdvisories,
        });
      } else {
        blockingVulnerabilities.push({
          pkg: pkgName,
          severity: pkgSeverity,
          advisories: unallowed,
        });
      }
    }
  }

  return {
    success: blockingVulnerabilities.length === 0,
    ignoredDirect,
    blockingVulnerabilities,
  };
}

function runAuditCheck() {
  const { auditLevel, reportFile } = parseArgs();
  const filePath = path.resolve(process.cwd(), reportFile);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Audit report file not found: ${filePath}`);
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to parse audit report: ${error.message}`);
    process.exit(1);
  }

  const result = evaluateAuditReport(report, auditLevel);

  console.log('📊 Security Audit Analysis');
  console.log('═══════════════════════════════════════');
  console.log(`Audit Level Threshold: ${auditLevel}`);

  if (result.error) {
    console.error(`❌ ${result.error}`);
    console.log('═══════════════════════════════════════');
    process.exit(1);
  }

  if (result.ignoredDirect.length > 0) {
    console.log('\n⚠️ Ignored known upstream unpatched advisories:');
    for (const item of result.ignoredDirect) {
      for (const adv of item.advisories) {
        console.log(
          `  - [${item.severity}] ${item.pkg}: ${adv.title} (${adv.url})`
        );
      }
    }
  }

  if (!result.success) {
    console.error('\n❌ Blocking vulnerabilities detected:');
    for (const item of result.blockingVulnerabilities) {
      for (const adv of item.advisories) {
        console.error(
          `  - [${item.severity}] ${item.pkg}: ${adv.title} (${adv.url})`
        );
      }
    }
    console.log('═══════════════════════════════════════');
    process.exit(1);
  }

  console.log('\n✅ No blocking vulnerabilities found!');
  console.log('═══════════════════════════════════════');
  process.exit(0);
}

if (require.main === module) {
  runAuditCheck();
}

module.exports = {
  ALLOWED_ADVISORIES,
  parseArgs,
  evaluateAuditReport,
  runAuditCheck,
};
