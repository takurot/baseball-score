import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const scriptPath = path.resolve(
  __dirname,
  '../../../scripts/check-coverage.js'
);

const createFixtureDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-check-'));

const writeSummary = (
  dir: string,
  pctByMetric: {
    lines?: unknown;
    functions?: unknown;
    statements?: unknown;
    branches?: unknown;
  }
): string => {
  const summaryPath = path.join(dir, 'coverage-summary.json');
  const entry = (pct: unknown) => ({
    total: 100,
    covered: 80,
    skipped: 0,
    pct,
  });
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({
      total: {
        lines: entry(pctByMetric.lines),
        functions: entry(pctByMetric.functions),
        statements: entry(pctByMetric.statements),
        branches: entry(pctByMetric.branches),
      },
    })
  );
  return summaryPath;
};

const runScript = (
  env: Record<string, string>
): { status: number | null; output: string } => {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
};

describe('check-coverage script', () => {
  let fixtureDir: string;

  beforeEach(() => {
    fixtureDir = createFixtureDir();
  });

  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('treats a whitespace-only COVERAGE_THRESHOLD as unset', () => {
    const summaryPath = writeSummary(fixtureDir, {
      lines: 82.74,
      functions: 90.4,
      statements: 83.27,
      branches: 67.13,
    });

    const { status, output } = runScript({
      COVERAGE_THRESHOLD: '   ',
      COVERAGE_SUMMARY_PATH: summaryPath,
    });

    expect(status).toBe(0);
    expect(output).toMatch(/Threshold:\s+30%/);
  });

  it('fails fast when COVERAGE_THRESHOLD is not a number', () => {
    const summaryPath = writeSummary(fixtureDir, {
      lines: 82.74,
      functions: 90.4,
      statements: 83.27,
      branches: 67.13,
    });

    const { status, output } = runScript({
      COVERAGE_THRESHOLD: 'abc',
      COVERAGE_SUMMARY_PATH: summaryPath,
    });

    expect(status).toBe(1);
    expect(output).toMatch(/Invalid COVERAGE_THRESHOLD/);
  });

  it('fails fast without NaN% output when a metric pct is not a number', () => {
    const summaryPath = writeSummary(fixtureDir, {
      lines: 'not-a-number',
      functions: 90.4,
      statements: 83.27,
      branches: 67.13,
    });

    const { status, output } = runScript({
      COVERAGE_SUMMARY_PATH: summaryPath,
    });

    expect(status).toBe(1);
    expect(output).not.toMatch(/NaN%/);
    expect(output).toMatch(/Invalid coverage data/);
  });

  it('passes when all metrics meet the threshold', () => {
    const summaryPath = writeSummary(fixtureDir, {
      lines: 82.74,
      functions: 90.4,
      statements: 83.27,
      branches: 67.13,
    });

    const { status, output } = runScript({
      COVERAGE_SUMMARY_PATH: summaryPath,
    });

    expect(status).toBe(0);
    expect(output).toMatch(/Coverage Check Passed/);
  });

  it('fails when any metric is below the threshold', () => {
    const summaryPath = writeSummary(fixtureDir, {
      lines: 82.74,
      functions: 90.4,
      statements: 83.27,
      branches: 20,
    });

    const { status, output } = runScript({
      COVERAGE_SUMMARY_PATH: summaryPath,
    });

    expect(status).toBe(1);
    expect(output).toMatch(/Branches/);
  });

  it('fails when the coverage summary file does not exist', () => {
    const { status, output } = runScript({
      COVERAGE_SUMMARY_PATH: path.join(fixtureDir, 'missing.json'),
    });

    expect(status).toBe(1);
    expect(output).toMatch(/Coverage summary not found/);
  });
});
