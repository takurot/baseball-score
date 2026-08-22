import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatForm from '../AtBatForm';
import { AtBat, Player } from '../../types';

jest.mock('uuid', () => ({ v4: () => 'new-at-bat' }));

const player: Player = {
  id: 'player-1',
  name: '山田',
  number: '1',
  position: '投手',
  isActive: true,
  order: 1,
};

const editingAtBat: AtBat = {
  id: 'at-bat-1',
  playerId: player.id,
  inning: 1,
  isTop: true,
  result: 'HR',
  description: '前回のメモ',
  rbi: 3,
  isOut: false,
};

const renderForm = (props: React.ComponentProps<typeof AtBatForm>) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <AtBatForm {...props} />
    </ThemeProvider>
  );

describe('AtBatForm', () => {
  test('更新コールバックがなくても新規打席を追加しない', async () => {
    const onAddAtBat = jest.fn();

    renderForm({
      player: null,
      inning: 1,
      isTop: true,
      onAddAtBat,
      editingAtBat,
    });

    expect(screen.getByRole('button', { name: '更新' })).toBeDisabled();

    expect(onAddAtBat).not.toHaveBeenCalled();
  });

  test('編集終了後も更新成功メッセージを表示する', async () => {
    const user = userEvent.setup();
    const onUpdateAtBat = jest.fn();
    const { rerender } = renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat: jest.fn(),
      editingAtBat,
      onUpdateAtBat,
    });

    await user.click(screen.getByRole('button', { name: '更新' }));
    rerender(
      <ThemeProvider theme={createTheme()}>
        <AtBatForm
          player={player}
          inning={1}
          isTop={true}
          onAddAtBat={jest.fn()}
          editingAtBat={null}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      '打席結果を更新しました'
    );
  });

  test('編集対象が外部でクリアされたら入力値を初期化する', async () => {
    const onAddAtBat = jest.fn();
    const user = userEvent.setup();
    const { rerender } = renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat,
      editingAtBat,
      onUpdateAtBat: jest.fn(),
    });

    rerender(
      <ThemeProvider theme={createTheme()}>
        <AtBatForm
          player={player}
          inning={1}
          isTop={true}
          onAddAtBat={onAddAtBat}
          editingAtBat={null}
        />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onAddAtBat).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'GO_2B',
        description: undefined,
        rbi: 0,
      })
    );
  });
});
