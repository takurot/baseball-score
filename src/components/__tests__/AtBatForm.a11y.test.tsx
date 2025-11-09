import React from 'react';
import { render } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatForm from '../AtBatForm';

// uuid は ESM のため、Jest 上ではモックして回避
jest.mock('uuid', () => ({ v4: () => 'test-id' }));

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('AtBatForm accessibility', () => {
  test('has no axe violations (empty state)', async () => {
    const { container } = renderWithTheme(
      <AtBatForm player={null} inning={1} isTop={true} onAddAtBat={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
