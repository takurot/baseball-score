import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TournamentVenue from '../TournamentVenue';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);

describe('TournamentVenue', () => {
  test('renders placeholder text when tournament is not provided and not in shared mode', () => {
    renderWithTheme(<TournamentVenue onClick={jest.fn()} />);

    expect(screen.getByText('大会名をクリックして設定')).toBeInTheDocument();
  });

  test('renders empty text when tournament and venue are not provided in shared mode', () => {
    const { container } = renderWithTheme(
      <TournamentVenue isSharedMode={true} />
    );

    expect(
      screen.queryByText('大会名をクリックして設定')
    ).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  test('renders venue without dangling @ prefix when tournament is not provided', () => {
    renderWithTheme(<TournamentVenue venue="東京ドーム" isSharedMode={true} />);

    expect(screen.getByText('東京ドーム')).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  test('renders both tournament and venue separated with @ when both provided', () => {
    renderWithTheme(
      <TournamentVenue
        tournament="夏季大会"
        venue="阪神甲子園球場"
        onClick={jest.fn()}
      />
    );

    expect(screen.getByText('夏季大会 @ 阪神甲子園球場')).toBeInTheDocument();
  });

  test('is keyboard accessible as a button when onClick is provided and not shared mode', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <TournamentVenue tournament="夏季大会" onClick={handleClick} />
    );

    const button = screen.getByRole('button', { name: '夏季大会' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is not rendered as a button when in shared mode or onClick is not provided', () => {
    renderWithTheme(
      <TournamentVenue
        tournament="夏季大会"
        isSharedMode={true}
        onClick={jest.fn()}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('夏季大会')).toBeInTheDocument();
  });
});
