import { getNewTheme, fontFamilies, accessibilityTokens } from '../tokens';

describe('theme tokens', () => {
  test('exports consistent font families', () => {
    expect(fontFamilies.base).toBe(
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    );
    expect(fontFamilies.heading).toBe("'Outfit', 'Inter', sans-serif");
  });

  test('applies font families to light and dark themes', () => {
    const lightTheme = getNewTheme('light');
    const darkTheme = getNewTheme('dark');

    expect(lightTheme.typography.fontFamily).toBe(fontFamilies.base);
    expect(darkTheme.typography.fontFamily).toBe(fontFamilies.base);

    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    headings.forEach((heading) => {
      expect(lightTheme.typography[heading].fontFamily).toBe(
        fontFamilies.heading
      );
      expect(darkTheme.typography[heading].fontFamily).toBe(
        fontFamilies.heading
      );
    });
  });

  test('accessibility tokens specify 48px minimum touch target size', () => {
    expect(accessibilityTokens?.touchTarget?.minHeight).toBe('48px');
    expect(accessibilityTokens?.touchTarget?.minWidth).toBe('48px');
  });
});
