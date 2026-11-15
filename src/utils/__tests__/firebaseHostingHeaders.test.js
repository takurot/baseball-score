const fs = require('fs');
const {
  applyProductionCspToHtml,
} = require('../../../scripts/apply-production-csp');
const path = require('path');

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../firebase.json'), 'utf8')
);
const headers = Object.fromEntries(
  config.hosting.headers
    .find((group) => group.source === '**')
    .headers.map(({ key, value }) => [key, value])
);
const directive = (name) =>
  headers['Content-Security-Policy']
    .split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `)) || '';

describe('the CSP copied into the built index.html', () => {
  it('has no frame-ancestors (ignored in a meta tag) and keeps the rest', () => {
    const html =
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'" />';
    const built = applyProductionCspToHtml(
      html,
      headers['Content-Security-Policy']
    );
    expect(built).not.toContain('frame-ancestors');
    expect(built).toContain("object-src 'none'");
    expect(built).toContain('https://*.googleusercontent.com');
  });
});

describe('firebase.json hosting security headers', () => {
  it('sends HSTS for a year on every response, without dropping what Hosting sends by default', () => {
    // Firebase Hosting already sends `max-age=31556926; includeSubDomains; preload`.
    // A custom header must not make that weaker, so includeSubDomains is kept.
    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains'
    );
  });

  it('disables powerful browser features the app does not use', () => {
    const policy = headers['Permissions-Policy'];
    for (const feature of [
      'camera',
      'microphone',
      'geolocation',
      'payment',
      'usb',
      'interest-cohort',
    ]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it('keeps the existing basic headers', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('only lets the site itself frame the app', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'self'");
  });

  it('lists image origins instead of allowing any https origin', () => {
    const imgSrc = directive('img-src').split(/\s+/);
    expect(imgSrc).not.toContain('https:');
    expect(imgSrc).toEqual(
      expect.arrayContaining([
        "'self'",
        'data:',
        'https://*.googleusercontent.com',
      ])
    );
  });

  it('no longer allows the Realtime Database domains the app does not use', () => {
    const csp = headers['Content-Security-Policy'];
    expect(csp).not.toContain('firebaseio.com');
    // Firestore, Auth and App Check still reach googleapis.com
    expect(directive('connect-src')).toContain('https://*.googleapis.com');
  });

  it("keeps 'unsafe-inline' for styles (MUI/Emotion injects inline styles) and nothing else for scripts", () => {
    expect(directive('style-src')).toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
  });
});
