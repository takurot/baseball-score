import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../test/axe';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import AtBatForm from '../AtBatForm';
import { Player } from '../../types';

// uuid は ESM のため、Jest 上ではモックして回避
jest.mock('uuid', () => ({ v4: () => 'test-id' }));

const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({});
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const player: Player = {
  id: 'player-1',
  name: '山田',
  number: '1',
  position: '投手',
  isActive: true,
  order: 1,
};

describe('AtBatForm accessibility', () => {
  test('has no axe violations (empty state)', async () => {
    const { container } = renderWithTheme(
      <AtBatForm player={null} inning={1} isTop={true} onAddAtBat={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('has no axe violations (結果未選択の打席登録フォーム)', async () => {
    const { container } = renderWithTheme(
      <AtBatForm
        player={player}
        inning={1}
        isTop={true}
        onAddAtBat={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('has no axe violations (結果選択後の打席登録フォーム)', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = renderWithTheme(
      <AtBatForm
        player={player}
        inning={1}
        isTop={true}
        onAddAtBat={() => {}}
      />
    );

    await user.click(getByRole('button', { name: '内野安打' }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
