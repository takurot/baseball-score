const {
  ALLOWED_ADVISORIES,
  parseArgs,
  evaluateAuditReport,
} = require('../../../scripts/check-audit');

describe('check-audit', () => {
  describe('parseArgs', () => {
    it('returns default values when no args provided', () => {
      const { auditLevel, reportFile } = parseArgs([]);
      expect(auditLevel).toBe('moderate');
      expect(reportFile).toBe('audit-report.json');
    });

    it('parses custom audit level and report file', () => {
      const { auditLevel, reportFile } = parseArgs([
        '--audit-level=high',
        'custom-report.json',
      ]);
      expect(auditLevel).toBe('high');
      expect(reportFile).toBe('custom-report.json');
    });
  });

  describe('evaluateAuditReport', () => {
    it('returns error on empty report', () => {
      const result = evaluateAuditReport(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty audit report');
    });

    it('returns error on npm audit error', () => {
      const result = evaluateAuditReport({
        error: { summary: 'ENOTFOUND registry.npmjs.org' },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOTFOUND');
    });

    it('passes when no vulnerabilities exist', () => {
      const result = evaluateAuditReport({ vulnerabilities: {} });
      expect(result.success).toBe(true);
      expect(result.blockingVulnerabilities).toHaveLength(0);
      expect(result.ignoredDirect).toHaveLength(0);
    });

    it('ignores allowed advisories like braces', () => {
      const allowedId = Array.from(ALLOWED_ADVISORIES)[0];
      const report = {
        vulnerabilities: {
          braces: {
            severity: 'high',
            via: [
              {
                title: 'braces vulnerable to stack-exhaustion',
                url: `https://github.com/advisories/${allowedId}`,
              },
            ],
          },
          micromatch: {
            severity: 'high',
            via: ['braces'],
          },
        },
      };

      const result = evaluateAuditReport(report, 'moderate');
      expect(result.success).toBe(true);
      expect(result.ignoredDirect).toHaveLength(1);
      expect(result.ignoredDirect[0].pkg).toBe('braces');
      expect(result.blockingVulnerabilities).toHaveLength(0);
    });

    it('blocks unallowed vulnerabilities', () => {
      const report = {
        vulnerabilities: {
          'some-bad-package': {
            severity: 'high',
            via: [
              {
                title: 'Remote code execution',
                url: 'https://github.com/advisories/GHSA-xxxx-xxxx-xxxx',
              },
            ],
          },
        },
      };

      const result = evaluateAuditReport(report, 'moderate');
      expect(result.success).toBe(false);
      expect(result.blockingVulnerabilities).toHaveLength(1);
      expect(result.blockingVulnerabilities[0].pkg).toBe('some-bad-package');
    });

    it('respects audit-level threshold', () => {
      const report = {
        vulnerabilities: {
          'low-vuln-pkg': {
            severity: 'low',
            via: [
              {
                title: 'Minor issue',
                url: 'https://github.com/advisories/GHSA-yyyy-yyyy-yyyy',
              },
            ],
          },
        },
      };

      // audit-level=moderate should ignore low severity
      const resultModerate = evaluateAuditReport(report, 'moderate');
      expect(resultModerate.success).toBe(true);

      // audit-level=low should block low severity
      const resultLow = evaluateAuditReport(report, 'low');
      expect(resultLow.success).toBe(false);
    });
  });
});
