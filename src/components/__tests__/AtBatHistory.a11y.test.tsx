import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from '../../setupTests';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatHistory from '../AtBatHistory';
import { AtBat, Player, HitResult, RunEvent, OutEvent } from '../../types';

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockPlayers: Player[] = [
  {
    id: 'p1',
    name: '山田太郎',
    number: '1',
    position: '投手',
    isActive: true,
    order: 1,
  },
];

const mockAtBats: AtBat[] = [
  {
    id: 'ab1',
    playerId: 'p1',
    inning: 1,
    isTop: true,
    result: 'HR' as HitResult,
    description: '特大ホームラン',
    rbi: 2,
    isOut: false,
  },
];

const mockRunEvents: RunEvent[] = [
  {
    id: 're1',
    inning: 1,
    isTop: true,
    runType: 'ワイルドピッチ',
    runCount: 1,
    note: '暴投で生還',
    timestamp: Date.now(),
  },
];

const mockOutEvents: OutEvent[] = [
  {
    id: 'oe1',
    inning: 1,
    isTop: true,
    outType: '盗塁死',
    note: '二塁刺殺',
    timestamp: Date.now(),
  },
];

describe('AtBatHistory accessibility', () => {
  test('has no axe violations with complete history', async () => {
    const { container } = renderWithTheme(
      <AtBatHistory
        atBats={mockAtBats}
        players={mockPlayers}
        inning={1}
        isTop={true}
        runEvents={mockRunEvents}
        outEvents={mockOutEvents}
        onEditAtBat={jest.fn()}
        onDeleteAtBat={jest.fn()}
        onDeleteRunEvent={jest.fn()}
        onDeleteOutEvent={jest.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('provides accessible names for all action buttons', () => {
    renderWithTheme(
      <AtBatHistory
        atBats={mockAtBats}
        players={mockPlayers}
        inning={1}
        isTop={true}
        runEvents={mockRunEvents}
        outEvents={mockOutEvents}
        onEditAtBat={jest.fn()}
        onDeleteAtBat={jest.fn()}
        onDeleteRunEvent={jest.fn()}
        onDeleteOutEvent={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    expect(deleteButtons).toHaveLength(3);
  });
});
