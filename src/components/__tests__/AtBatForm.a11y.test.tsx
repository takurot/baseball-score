import React from 'react';
import { render } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatForm from '../AtBatForm';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('AtBatForm accessibility', () => {
  test('has no axe violations (empty state)', async () => {
    const { container } = renderWithTheme(
      <AtBatForm player={null} inning={1} onAddAtBat={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});


