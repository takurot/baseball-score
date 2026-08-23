import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PlayerList from '../PlayerList';
import { Player } from '../../types';

const activePlayer: Player = {
  id: 'p1',
  name: '選手1',
  number: '1',
  position: 'CF',
  isActive: true,
  order: 1,
};

const benchPlayer: Player = {
  id: 'p2',
  name: '選手2',
  number: '2',
  position: 'SS',
  isActive: false,
  order: 0,
};

const renderInDarkMode = () =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <PlayerList
        players={[activePlayer, benchPlayer]}
        onRegisterAtBat={jest.fn()}
        onToggleStatus={jest.fn()}
      />
    </ThemeProvider>
  );

describe('PlayerList dark mode colors', () => {
  test('「出場中の選手」見出しがハードコードされたライトグレーではなくテーマトークンで塗られる', () => {
    renderInDarkMode();

    const heading = screen.getByText('出場中の選手');
    const { backgroundColor } = getComputedStyle(heading);

    // 旧実装は #f5f5f5 相当のライトグレー背景で、ダーク背景の上に
    // そのまま浮いて見えるバグがあった。action.hover はモードに応じて
    // 白系の半透明オーバーレイになる（黒混じりの rgb(245,245,245) にはならない）
    expect(backgroundColor).not.toBe('rgb(245, 245, 245)');
    expect(backgroundColor).toContain('rgba(255, 255, 255');
  });

  test('「控えの選手」見出しも同様にテーマトークンで塗られる', () => {
    renderInDarkMode();

    const heading = screen.getByText('控えの選手');
    const { backgroundColor } = getComputedStyle(heading);

    expect(backgroundColor).not.toBe('rgb(245, 245, 245)');
    expect(backgroundColor).toContain('rgba(255, 255, 255');
  });

  test('控え選手の行がハードコードされた rgba(0,0,0,...) ではなくテーマトークンで塗られる', () => {
    renderInDarkMode();

    const row = screen.getByText('選手2').closest('tr');
    expect(row).not.toBeNull();
    const { backgroundColor } = getComputedStyle(row as HTMLElement);

    // 旧実装は rgba(0, 0, 0, 0.04) で、暗い背景の上では黒の半透明が
    // ほぼ見分けられなくなっていた
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0.04)');
    expect(backgroundColor).toContain('rgba(255, 255, 255');
  });
});
