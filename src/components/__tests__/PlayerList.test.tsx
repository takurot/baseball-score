import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import PlayerList, { registerAtBatButtonId } from '../PlayerList';
import { Player } from '../../types';

const mockActivePlayers: Player[] = [
  {
    id: 'p1',
    name: 'イチロー',
    number: '51',
    position: 'RF',
    isActive: true,
    order: 1,
  },
  {
    id: 'p2',
    name: '松井秀喜',
    number: '55',
    position: 'LF',
    isActive: true,
    order: 2,
  },
];

const mockBenchPlayers: Player[] = [
  {
    id: 'p3',
    name: '大谷翔平',
    number: '17',
    position: 'DH',
    isActive: false,
    order: 0,
  },
];

const renderPlayerList = (
  props?: Partial<React.ComponentProps<typeof PlayerList>>
) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <PlayerList
        players={[...mockActivePlayers, ...mockBenchPlayers]}
        onRegisterAtBat={jest.fn()}
        onToggleStatus={jest.fn()}
        onEditPlayer={jest.fn()}
        onUpdatePlayerOrder={jest.fn()}
        nextBatterPlayerId="p1"
        {...props}
      />
    </ThemeProvider>
  );
};

describe('PlayerList component', () => {
  test('「選手一覧」という重複見出しが表示されない', () => {
    renderPlayerList();
    // SectionCard 側で「選手一覧」見出しを持つため、PlayerList 内部には表示しない
    expect(
      screen.queryByRole('heading', { name: '選手一覧' })
    ).not.toBeInTheDocument();
  });

  test('出場中選手と控え選手が正しく分類され表示される', () => {
    renderPlayerList();

    expect(screen.getByText('出場中の選手')).toBeInTheDocument();
    expect(screen.getByText('控えの選手')).toBeInTheDocument();
    expect(screen.getByText('イチロー')).toBeInTheDocument();
    expect(screen.getByText('松井秀喜')).toBeInTheDocument();
    expect(screen.getByText('大谷翔平')).toBeInTheDocument();
  });

  test('次打者にバッジが表示され、打席登録ボタンに registerAtBatButtonId が設定される', () => {
    renderPlayerList();

    expect(screen.getByText('次打者')).toBeInTheDocument();
    const registerButton = document.getElementById(registerAtBatButtonId('p1'));
    expect(registerButton).toBeInTheDocument();
  });

  test('打席登録・ステータス切替・選手編集のハンドラーが正しく動作する', async () => {
    const onRegisterAtBat = jest.fn();
    const onToggleStatus = jest.fn();
    const onEditPlayer = jest.fn();
    const user = userEvent.setup();

    renderPlayerList({
      onRegisterAtBat,
      onToggleStatus,
      onEditPlayer,
    });

    const registerButton = document.getElementById(registerAtBatButtonId('p1'));
    if (registerButton) {
      await user.click(registerButton);
      expect(onRegisterAtBat).toHaveBeenCalledWith(mockActivePlayers[0]);
    }

    const benchButtons = screen.getAllByRole('button', { name: /控え/ });
    await user.click(benchButtons[0]);
    expect(onToggleStatus).toHaveBeenCalledWith('p1');

    const editButtons = screen.getAllByRole('button', {
      name: '選手情報を編集',
    });
    await user.click(editButtons[0]);
    expect(onEditPlayer).toHaveBeenCalledWith('p1');
  });

  test('出場中の選手が0人のときはメッセージを表示する', () => {
    renderPlayerList({ players: mockBenchPlayers });

    expect(screen.getByText('出場中の選手がいません')).toBeInTheDocument();
  });
});

describe('PlayerList mobile card view', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  test('モバイル表示時はテーブルではなくカード形式で表示され、省略語を使わない', () => {
    renderPlayerList();

    // 5列テーブル（table要素）が存在しないこと
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // カードレイアウトで選手情報が表示されること
    expect(screen.getByText('#51 イチロー')).toBeInTheDocument();
    expect(screen.getByText('#55 松井秀喜')).toBeInTheDocument();
    expect(screen.getByText('#17 大谷翔平')).toBeInTheDocument();

    // 省略語ではなく正式名称のボタンが表示されること
    const registerButtons = screen.getAllByRole('button', { name: /打席登録/ });
    expect(registerButtons.length).toBe(2);

    const benchButtons = screen.getAllByRole('button', { name: /控えに/ });
    expect(benchButtons.length).toBe(2);

    const playButtons = screen.getAllByRole('button', { name: /出場させる/ });
    expect(playButtons.length).toBe(1);
  });
});
