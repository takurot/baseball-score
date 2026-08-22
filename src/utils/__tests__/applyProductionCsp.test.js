const {
  extractProductionCsp,
  applyProductionCspToHtml,
} = require('../../../scripts/apply-production-csp');

describe('apply-production-csp', () => {
  describe('extractProductionCsp', () => {
    it('extracts the CSP value from the "**" hosting header rule', () => {
      const firebaseConfig = {
        hosting: {
          headers: [
            {
              source: '**',
              headers: [
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                {
                  key: 'Content-Security-Policy',
                  value: "default-src 'self'",
                },
              ],
            },
          ],
        },
      };

      expect(extractProductionCsp(firebaseConfig)).toBe("default-src 'self'");
    });

    it('throws when hosting.headers is missing', () => {
      expect(() => extractProductionCsp({})).toThrow(
        'hosting.headers が見つかりません'
      );
    });

    it('throws when no "**" source rule exists', () => {
      const firebaseConfig = {
        hosting: { headers: [{ source: '/api/**', headers: [] }] },
      };

      expect(() => extractProductionCsp(firebaseConfig)).toThrow(
        'source "**" 向けの headers が見つかりません'
      );
    });

    it('throws when the Content-Security-Policy header is absent', () => {
      const firebaseConfig = {
        hosting: {
          headers: [
            {
              source: '**',
              headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
            },
          ],
        },
      };

      expect(() => extractProductionCsp(firebaseConfig)).toThrow(
        'Content-Security-Policy ヘッダーが見つかりません'
      );
    });
  });

  describe('applyProductionCspToHtml', () => {
    const html = [
      '<head>',
      '<meta name="referrer" content="strict-origin-when-cross-origin" />',
      '<meta',
      '  http-equiv="Content-Security-Policy"',
      "  content=\"default-src 'self'; script-src 'self' 'unsafe-inline'\"",
      '/>',
      '</head>',
    ].join('\n');

    it('replaces the meta tag content with the production CSP', () => {
      const updated = applyProductionCspToHtml(
        html,
        "default-src 'self'; script-src 'self'"
      );

      expect(updated).toContain(
        "content=\"default-src 'self'; script-src 'self'\""
      );
      expect(updated).not.toContain('unsafe-inline');
    });

    it('leaves the rest of the document untouched', () => {
      const updated = applyProductionCspToHtml(html, "default-src 'self'");

      expect(updated).toContain(
        '<meta name="referrer" content="strict-origin-when-cross-origin" />'
      );
    });

    it('throws when the CSP meta tag is missing', () => {
      expect(() =>
        applyProductionCspToHtml('<head></head>', "default-src 'self'")
      ).toThrow('Content-Security-Policy meta タグが見つかりません');
    });
  });
});
