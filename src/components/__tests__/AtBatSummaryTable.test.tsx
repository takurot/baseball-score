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

  test('ダークモードでアウトイベント行がハードコードされたライトグレーではなくテーマトークンで塗られる', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <AtBatSummaryTable
          team={team}
          maxInning={1}
          isTop={true}
          outEvents={outEvents}
        />
      </ThemeProvider>
    );

    const row = screen.getByText('その他のアウト').closest('tr');
    expect(row).not.toBeNull();
    const { backgroundColor } = getComputedStyle(row as HTMLElement);

    // 旧実装は #f8f8f8 相当のライトグレー背景で、ダーク背景の上に
    // そのまま浮いて見えるバグがあった
    expect(backgroundColor).not.toBe('rgb(248, 248, 248)');
    expect(backgroundColor).toContain('rgba(255, 255, 255');
  });

  test('各イニングの TableCell に unique な key が付与されており React warning が出ない', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderTable(true);
    const keyWarnings = errorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          arg.includes('Each child in a list should have a unique "key" prop')
      )
    );
    expect(keyWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
