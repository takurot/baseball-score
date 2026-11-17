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

describe('AtBatSummaryTable - アクセシビリティ', () => {
  test('表に「◯◯の打席結果一覧」というアクセシブルな名前が付く', () => {
    renderTable(true);
    expect(
      screen.getByRole('table', { name: '後攻チームの打席結果一覧' })
    ).toBeInTheDocument();
  });

  test('選手名のセルは行見出しで、列見出しも取得できる', () => {
    renderTable(true);
    expect(
      screen.getByRole('rowheader', { name: /選手1/ })
    ).toBeInTheDocument();
    for (const name of [
      '打順',
      '選手名',
      '1回',
      '打数',
      '安打',
      '打点',
      '打率',
      'OPS',
    ]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
  });

  test('その他のアウトの行も、ラベルが行見出しになる', () => {
    renderTable(true);
    expect(
      screen.getByRole('rowheader', { name: 'その他のアウト' })
    ).toBeInTheDocument();
  });

  test('横スクロール領域はキーボードで到達でき、名前の付いた region として読まれる', () => {
    renderTable(true);
    const region = screen.getByRole('region', {
      name: /後攻チームの打席結果一覧/,
    });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(
      screen.getByRole('table', { name: '後攻チームの打席結果一覧' })
    );
  });
});
