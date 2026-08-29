import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from '../../test/axe';
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

  test('calls onClose when close icon button is clicked', () => {
    const handleClose = jest.fn();
    renderWithTheme(<HelpDialog open={true} onClose={handleClose} />);

    const closeIconButton = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeIconButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when bottom 閉じる button is clicked', () => {
    const handleClose = jest.fn();
    renderWithTheme(<HelpDialog open={true} onClose={handleClose} />);

    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    renderWithTheme(<HelpDialog open={true} onClose={handleClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), {
      key: 'Escape',
      code: 'Escape',
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('does not display dialog when open is false', () => {
    renderWithTheme(<HelpDialog open={false} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
