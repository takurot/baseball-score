const { test, expect, describe } = require('@jest/globals');
const React = require('react');
const { render } = require('@testing-library/react');

describe('theme accessibility tokens', () => {
  test('Theme に accessibility トークンが含まれること', async () => {
    const { createAppTheme } = require('./theme');
    const theme = createAppTheme('light');
    expect(theme.accessibility).toBeDefined();
    expect(theme.accessibility.focusVisible).toBeDefined();
    expect(theme.accessibility.touchTarget).toBeDefined();
    expect(theme.accessibility.touchTarget.minHeight).toBe('48px');
    expect(theme.accessibility.focusVisible.outline).toBe('2px solid');
  });
});
