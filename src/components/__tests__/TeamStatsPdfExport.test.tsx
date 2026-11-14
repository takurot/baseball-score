import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import TeamStatsPdfExport from '../TeamStatsPdfExport';
import { getUserTeams } from '../../firebase/teamService';
import {
  buildTeamReportStats,
  getTeamReportInput,
} from '../../firebase/statsService';
import { createTeamStatsPdf } from '../../services/TeamStatsPdf';
jest.mock('../../firebase/teamService', () => ({ getUserTeams: jest.fn() }));
jest.mock('../../firebase/authService', () => ({
  getCurrentUser: () => ({ uid: 'u' }),
  onAuthStateChange: () => () => {},
}));
jest.mock('../../firebase/statsService', () => ({
  getTeamReportInput: jest.fn(),
  buildTeamReportStats: jest.fn(),
}));
jest.mock('../../services/TeamStatsPdf', () => ({
  createTeamStatsPdf: jest.fn(),
}));

const games = [{ id: 'g1' }];
const sections = [{ teamId: 't' }];
const startGeneration = async () => {
  (getUserTeams as jest.Mock).mockResolvedValue([{ id: 't', name: '対象' }]);
  (getTeamReportInput as jest.Mock).mockResolvedValue({
    games,
    team: { id: 't' },
  });
  (buildTeamReportStats as jest.Mock).mockReturnValue(sections);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  URL.createObjectURL = jest.fn(() => 'blob:pdf');
  URL.revokeObjectURL = jest.fn();
  render(<TeamStatsPdfExport />);
  fireEvent.click(screen.getByText('PDF出力'));
  fireEvent.mouseDown(await screen.findByRole('combobox'));
  fireEvent.click(await screen.findByText('対象（ID: t）'));
  const generate = screen.getByText('生成してダウンロード');
  fireEvent.click(generate);
  fireEvent.click(generate);
};

test('builds every chart from the one fetched game set and downloads once', async () => {
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  (createTeamStatsPdf as jest.Mock).mockResolvedValue(new Uint8Array([1]));
  await startGeneration();
  expect(screen.getByText(/打撃成績推移グラフ/)).toBeInTheDocument();
  await screen.findByText('PDFを生成し、ダウンロードを開始しました');
  expect(getTeamReportInput).toHaveBeenCalledTimes(1);
  expect(createTeamStatsPdf).toHaveBeenCalledTimes(1);
  expect((createTeamStatsPdf as jest.Mock).mock.calls[0].slice(0, 2)).toEqual([
    sections,
    games,
  ]);
  expect(click).toHaveBeenCalledTimes(1);
  click.mockRestore();
});

test.each([
  [
    'a chart failure',
    async () => {
      throw new Error('試合日付が不正なため推移を作成できません');
    },
    '試合日付が不正なため推移を作成できません',
  ],
  [
    'cancellation during chart pages',
    async (...args: unknown[]) => {
      fireEvent.click(screen.getByText('キャンセル'));
      (args[4] as () => void)();
      return new Uint8Array([1]);
    },
    'キャンセルまたはログイン状態の変更により中止しました',
  ],
])('saves no file after %s', async (_label, impl, message) => {
  (createTeamStatsPdf as jest.Mock).mockImplementation(impl);
  await startGeneration();
  await screen.findByText(message);
  await waitFor(() =>
    expect(screen.getByText('生成してダウンロード')).toBeEnabled()
  );
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
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
