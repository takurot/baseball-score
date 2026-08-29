import { getNewTheme, fontFamilies, accessibilityTokens } from '../tokens';

const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (hex1: string, hex2: string): number => {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme tokens & contrast compliance', () => {
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

  test('focus visible tokens have distinct outline width', () => {
    expect(accessibilityTokens?.focusVisible?.outline).toContain('2px');
    expect(accessibilityTokens?.focusVisible?.outlineOffset).toBe('2px');
  });

  test('primary colors meet contrast expectations', () => {
    const lightTheme = getNewTheme('light');
    const darkTheme = getNewTheme('dark');

    // Primary button contrast on dark mode background (#0F172A)
    const darkBg = darkTheme.palette.background.default;
    const primaryMain = lightTheme.palette.primary.main;
    const contrastOnDark = getContrastRatio(darkBg, primaryMain);

    // WCAG AA for UI components is at least 3.0:1
    expect(contrastOnDark).toBeGreaterThanOrEqual(3.0);
  });
});

