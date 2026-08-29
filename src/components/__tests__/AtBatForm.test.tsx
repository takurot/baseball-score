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

  test('編集対象が外部でクリアされたら入力値を初期化し、結果が未選択の間は登録できない', async () => {
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

    // 結果が未選択の間は登録できない（誤った既定値での登録を防ぐ）
    expect(screen.getByRole('button', { name: '登録' })).toBeDisabled();
    expect(onAddAtBat).not.toHaveBeenCalled();

    // 結果をタップして選択すると登録できるようになる
    await user.click(screen.getByRole('button', { name: '内野安打' }));
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onAddAtBat).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'IH',
        description: undefined,
        rbi: 0,
      })
    );
  });

  test('打席結果をボタンでタップして選択できる', async () => {
    const onAddAtBat = jest.fn();
    const user = userEvent.setup();
    renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat,
    });

    expect(screen.getByRole('button', { name: '登録' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'ホームラン' }));
    expect(screen.getByRole('button', { name: '登録' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onAddAtBat).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'HR', isOut: false })
    );
  });

  test('選手未選択時は選択を促すメッセージを表示する', () => {
    renderForm({
      player: null,
      inning: 1,
      isTop: true,
      onAddAtBat: jest.fn(),
      editingAtBat: null,
    });

    expect(
      screen.getByText('選手リストから選手をクリックして選択してください')
    ).toBeInTheDocument();
  });

  test('編集モードで選手がnullの場合は不明な選手と表示する', () => {
    renderForm({
      player: null,
      inning: 1,
      isTop: true,
      onAddAtBat: jest.fn(),
      editingAtBat,
      onUpdateAtBat: jest.fn(),
    });

    expect(
      screen.getByRole('heading', { name: /打席結果編集: 不明な選手/ })
    ).toBeInTheDocument();
  });

  test('キャンセルボタンで onCancelEdit が呼ばれる', async () => {
    const onCancelEdit = jest.fn();
    const user = userEvent.setup();

    renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat: jest.fn(),
      editingAtBat,
      onUpdateAtBat: jest.fn(),
      onCancelEdit,
    });

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    await user.click(cancelButton);

    expect(onCancelEdit).toHaveBeenCalledTimes(1);
  });

  test('メモと打点を入力して送信できる', async () => {
    const onAddAtBat = jest.fn();
    const user = userEvent.setup();

    renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat,
    });

    // ヒットを選択
    await user.click(screen.getByRole('button', { name: 'レフトヒット' }));

    // 打点を設定（MUI Select）
    const rbiSelect = screen.getByLabelText('打点');
    await user.click(rbiSelect);
    const rbiOption = await screen.findByRole('option', { name: '2' });
    await user.click(rbiOption);

    // メモを入力
    const memoInput = screen.getByLabelText(/メモ/);
    await user.type(memoInput, 'レフト線へのライナー');

    // 登録
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onAddAtBat).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'LH',
        rbi: 2,
        description: 'レフト線へのライナー',
        isOut: false,
      })
    );
  });

  test('アウト結果が正しく isOut: true として送信される', async () => {
    const onAddAtBat = jest.fn();
    const user = userEvent.setup();

    renderForm({
      player,
      inning: 1,
      isTop: true,
      onAddAtBat,
    });

    await user.click(screen.getByRole('button', { name: '三振' }));
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(onAddAtBat).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'SO',
        isOut: true,
      })
    );
  });
});
