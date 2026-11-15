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
import { DETAILED_PDF_OPTIONS } from '../../services/TeamStatsPdfOptions';
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

describe('output options', () => {
  const dated = [
    { id: 'in', date: '2026-05-10' },
    { id: 'out', date: '2026-04-01' },
  ];
  const openWithTeam = async () => {
    (getUserTeams as jest.Mock).mockResolvedValue([{ id: 't', name: '対象' }]);
    (getTeamReportInput as jest.Mock).mockResolvedValue({
      games: dated,
      team: { id: 't' },
    });
    (buildTeamReportStats as jest.Mock).mockReturnValue(sections);
    (createTeamStatsPdf as jest.Mock).mockResolvedValue(new Uint8Array([1]));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    });
    URL.createObjectURL = jest.fn(() => 'blob:pdf');
    URL.revokeObjectURL = jest.fn();
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(<TeamStatsPdfExport />);
    fireEvent.click(screen.getByText('PDF出力'));
    fireEvent.mouseDown(await screen.findByRole('combobox'));
    fireEvent.click(await screen.findByText('対象（ID: t）'));
  };
  const optionsPassed = () =>
    (createTeamStatsPdf as jest.Mock).mock.calls.at(-1)![5];

  beforeEach(() => jest.clearAllMocks());

  test('keeps the detailed report as the default and hides the simple options', async () => {
    await openWithTeam();
    expect(screen.getByLabelText(/詳細版/)).toBeChecked();
    expect(screen.queryByLabelText('開始日')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('生成してダウンロード'));
    await screen.findByText('PDFを生成し、ダウンロードを開始しました');
    expect(optionsPassed()).toEqual(DETAILED_PDF_OPTIONS);
    expect(buildTeamReportStats).toHaveBeenCalledWith(dated, { id: 't' });
  });

  test('passes the chosen simple options and builds the tables from the games in the period', async () => {
    await openWithTeam();
    fireEvent.click(screen.getByLabelText(/簡易版/));
    fireEvent.change(screen.getByLabelText('開始日'), {
      target: { value: '2026-05-01' },
    });
    fireEvent.change(screen.getByLabelText('終了日'), {
      target: { value: '2026-05-31' },
    });
    fireEvent.click(screen.getByLabelText('公式戦'));
    fireEvent.click(screen.getByLabelText('表のみ'));
    fireEvent.click(screen.getByText('生成してダウンロード'));
    await screen.findByText('PDFを生成し、ダウンロードを開始しました');
    expect(optionsPassed()).toEqual({
      types: ['practice', 'junior'],
      period: { start: '2026-05-01', end: '2026-05-31' },
      charts: 'none',
      omitEmptyCharts: false,
    });
    // tables and charts share this one filtered set
    const games = [{ id: 'in', date: '2026-05-10' }];
    expect(buildTeamReportStats).toHaveBeenCalledWith(games, { id: 't' });
    expect((createTeamStatsPdf as jest.Mock).mock.calls.at(-1)![1]).toEqual(
      games
    );
  });

  test('offers the empty-frame option only while every player is charted', async () => {
    await openWithTeam();
    fireEvent.click(screen.getByLabelText(/簡易版/));
    const omit = screen.getByLabelText(/打席記録のない選手のグラフ枠を省略/);
    expect(omit).toBeEnabled();
    fireEvent.click(omit);
    fireEvent.click(screen.getByLabelText('チームのみ'));
    expect(omit).toBeDisabled();
    fireEvent.click(screen.getByLabelText('チームと全選手'));
    expect(omit).toBeEnabled();
    fireEvent.click(screen.getByText('生成してダウンロード'));
    await screen.findByText('PDFを生成し、ダウンロードを開始しました');
    expect(optionsPassed().omitEmptyCharts).toBe(true);
    expect(optionsPassed().charts).toBe('all');
  });

  test('refuses a half-typed date instead of silently using the whole period', async () => {
    await openWithTeam();
    fireEvent.click(screen.getByLabelText(/簡易版/));
    const start = screen.getByLabelText('開始日');
    fireEvent.change(start, { target: { value: '2026-05-01' } });
    // clearing one field of a complete date makes the input report '' with badInput
    Object.defineProperty(start, 'validity', {
      value: { badInput: true },
      configurable: true,
    });
    fireEvent.change(start, { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent('開始日が入力途中です');
    expect(screen.getByText('生成してダウンロード')).toBeDisabled();
    Object.defineProperty(start, 'validity', {
      value: { badInput: false },
      configurable: true,
    });
    fireEvent.change(start, { target: { value: '2026-05-01' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('生成してダウンロード')).toBeEnabled();
  });

  test('describes the output that matches the chosen mode', async () => {
    await openWithTeam();
    expect(
      screen.getByText(/公式戦・練習試合・ジュニア戦を順に出力/)
    ).toBeVisible();
    fireEvent.click(screen.getByLabelText(/簡易版/));
    expect(
      screen.queryByText(/公式戦・練習試合・ジュニア戦を順に出力/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/選択した期間・区分・グラフの範囲で出力します/)
    ).toBeVisible();
  });

  test('explains an unusable choice and blocks the export', async () => {
    await openWithTeam();
    fireEvent.click(screen.getByLabelText(/簡易版/));
    for (const name of ['公式戦', '練習試合', 'ジュニア戦']) {
      fireEvent.click(screen.getByLabelText(name));
    }
    expect(screen.getByRole('alert')).toHaveTextContent(
      '出力する区分を1つ以上'
    );
    expect(screen.getByText('生成してダウンロード')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('公式戦'));
    fireEvent.change(screen.getByLabelText('開始日'), {
      target: { value: '2026-06-01' },
    });
    fireEvent.change(screen.getByLabelText('終了日'), {
      target: { value: '2026-05-01' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('開始日は終了日以前');
    expect(screen.getByText('生成してダウンロード')).toBeDisabled();
    // `region` judges whole pages; this renders only the dialog
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } })
    ).toHaveNoViolations();
  });
});
