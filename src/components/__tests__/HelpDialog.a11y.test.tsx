import React from 'react';
import { render } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HelpDialog from '../HelpDialog';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('HelpDialog accessibility', () => {
  test('has no axe violations when open', async () => {
    const { container } = renderWithTheme(
      <HelpDialog open={true} onClose={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
