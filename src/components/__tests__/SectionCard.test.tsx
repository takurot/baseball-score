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
});

