import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatSummaryTable from '../AtBatSummaryTable';
import { Team, OutEvent } from '../../types';

const team: Team = {
  id: 'team-1',
  name: '後攻チーム',
  players: [
    {
      id: 'p1',
      name: '選手1',
      number: '1',
      position: 'CF',
      isActive: true,
      order: 1,
    },
  ],
  atBats: [],
};

const outEvents: OutEvent[] = [
  {
    id: 'oe-top',
    inning: 1,
    isTop: true,
    outType: '牽制アウト',
    note: '表チームのアウト',
    timestamp: new Date(),
  },
  {
    id: 'oe-bottom',
    inning: 1,
    isTop: false,
    outType: 'タッチアウト',
    note: '裏チームのアウト',
    timestamp: new Date(),
  },
];

const renderTable = (isTop: boolean) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <AtBatSummaryTable
        team={team}
        maxInning={1}
        isTop={isTop}
        outEvents={outEvents}
      />
    </ThemeProvider>
  );

describe('AtBatSummaryTable', () => {
  test('表のタブでは表のアウトイベントのみを表示する', () => {
    renderTable(true);

    expect(
      screen.getByLabelText('牽制アウト - 表チームのアウト')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('タッチアウト - 裏チームのアウト')
    ).not.toBeInTheDocument();
  });

  test('裏のタブでは裏のアウトイベントのみを表示する', () => {
    renderTable(false);

    expect(
      screen.getByLabelText('タッチアウト - 裏チームのアウト')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('牽制アウト - 表チームのアウト')
    ).not.toBeInTheDocument();
  });
});
