import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import SectionCard from '../SectionCard';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);

describe('SectionCard', () => {
  test('renders title and children content', () => {
    renderWithTheme(
      <SectionCard title="選手一覧">
        <p>子要素</p>
      </SectionCard>
    );

    expect(
      screen.getByRole('heading', { name: '選手一覧' })
    ).toBeInTheDocument();
    expect(screen.getByText('子要素')).toBeInTheDocument();
  });

  test('renders optional actions area', () => {
    renderWithTheme(
      <SectionCard
        title="1回の操作"
        actions={<Button>追加</Button>}
        data-testid="section-card"
      >
        <p>content</p>
      </SectionCard>
    );

    expect(screen.getByRole('button', { name: '追加' })).toBeInTheDocument();
  });

  test('renders custom titleComponent', () => {
    renderWithTheme(
      <SectionCard title="試合情報" titleComponent="h3">
        <p>content</p>
      </SectionCard>
    );

    const heading = screen.getByRole('heading', { name: '試合情報', level: 3 });
    expect(heading).toBeInTheDocument();
  });

  test('preserves section element and aria-labelledby attribute with paperProps', () => {
    renderWithTheme(
      <SectionCard title="試合結果" data-testid="result-card" elevation={3}>
        <p>content</p>
      </SectionCard>
    );

    const section = screen.getByTestId('result-card');
    expect(section.tagName.toLowerCase()).toBe('section');
    expect(section).toHaveAttribute('aria-labelledby');
    const headingId = section.getAttribute('aria-labelledby');
    const heading = screen.getByRole('heading', { name: '試合結果' });
    expect(heading).toHaveAttribute('id', headingId);
  });

  test('supports array and function SxProps without throwing', () => {
    expect(() => {
      renderWithTheme(
        <SectionCard
          title="スタイルテスト"
          sx={[
            { backgroundColor: 'rgb(240, 240, 240)' },
            (theme) => ({ color: theme.palette.text.primary }),
          ]}
        >
          <p>content</p>
        </SectionCard>
      );
    }).not.toThrow();

    expect(
      screen.getByRole('heading', { name: 'スタイルテスト' })
    ).toBeInTheDocument();
  });
});
