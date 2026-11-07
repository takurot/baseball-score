import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import TeamStatsPdfExport from '../TeamStatsPdfExport';
import { getUserTeams } from '../../firebase/teamService';
jest.mock('../../firebase/teamService', () => ({ getUserTeams: jest.fn() }));
jest.mock('../../firebase/authService', () => ({
  getCurrentUser: () => ({ uid: 'u' }),
  onAuthStateChange: () => () => {},
}));
jest.mock('../../firebase/statsService', () => ({}));
test('explains missing registrations and disables export', async () => {
  (getUserTeams as jest.Mock).mockResolvedValue([]);
  render(<TeamStatsPdfExport />);
  fireEvent.click(screen.getByText('PDF出力'));
  await screen.findByText(/登録チームがありません/);
  expect(screen.getByText('生成してダウンロード')).toBeDisabled();
  expect(await axe(document.body)).toHaveNoViolations();
});
test('distinguishes same-name teams by their IDs', async () => {
  (getUserTeams as jest.Mock).mockResolvedValue([
    { id: 'first', name: '同名' },
    { id: 'second', name: '同名' },
  ]);
  render(<TeamStatsPdfExport />);
  fireEvent.click(screen.getByText('PDF出力'));
  await screen.findByRole('combobox');
  fireEvent.mouseDown(screen.getByRole('combobox'));
  expect(await screen.findByText('同名（ID: first）')).toBeVisible();
  expect(screen.getByText('同名（ID: second）')).toBeVisible();
});
test('does not present retrieval failure as an empty registration list', async () => {
  (getUserTeams as jest.Mock).mockRejectedValue(new Error('network'));
  render(<TeamStatsPdfExport />);
  fireEvent.click(screen.getByText('PDF出力'));
  await screen.findByText('登録チームを取得できませんでした');
  expect(screen.queryByText(/登録チームがありません/)).not.toBeInTheDocument();
  expect(screen.getByText('生成してダウンロード')).toBeDisabled();
});
