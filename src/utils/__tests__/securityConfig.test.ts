import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');

describe('security configuration', () => {
  it('ignores environment and Firebase credential files with an example allowlist', () => {
    const gitignore = fs.readFileSync(
      path.join(repoRoot, '.gitignore'),
      'utf8'
    );

    expect(gitignore).toMatch(/^\.env\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
    expect(gitignore).toMatch(/^serviceAccountKey\*\.json$/m);
    expect(gitignore).toMatch(/^serviceAccount\*\.json$/m);
    expect(gitignore).toMatch(/^\*-service-account\*\.json$/m);
    expect(gitignore).toMatch(/^\*firebase-adminsdk\*\.json$/m);
    expect(gitignore).toMatch(/^node_modules\/$/m);
  });

  it('declares browser security policies in the HTML template', () => {
    const html = fs.readFileSync(
      path.join(repoRoot, 'public/index.html'),
      'utf8'
    );

    expect(html).toContain(
      '<meta name="referrer" content="strict-origin-when-cross-origin" />'
    );
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain(
      "script-src 'self' https://www.googletagmanager.com"
    );
    expect(html).toContain("object-src 'none'");
    expect(html).toContain("base-uri 'self'");
  });

  it('prevents the hosted app from being framed by another origin', () => {
    const firebaseConfig = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'firebase.json'), 'utf8')
    ) as {
      hosting?: {
        headers?: Array<{
          source: string;
          headers: Array<{ key: string; value: string }>;
        }>;
      };
    };

    const globalHeaders = firebaseConfig.hosting?.headers?.find(
      ({ source }) => source === '**'
    )?.headers;

    expect(globalHeaders).toEqual(
      expect.arrayContaining([
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ])
    );
  });
});
