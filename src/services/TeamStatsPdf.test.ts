import { readFileSync } from 'fs';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import { createTeamStatsPdf, playerRowCells } from './TeamStatsPdf';
import {
  buildTeamReportStats,
  PlayerBattingStats,
} from '../firebase/statsService';
import { buildBattingTrend } from './BattingStatsTrend';
import { buildTrendScale, formatRate, TREND_SERIES } from './BattingTrendChart';
import { AtBat, Game, GameType, HitResult, TeamSetting } from '../types';
jest.mock('../firebase/config', () => ({ db: {} }));
jest.mock('../firebase/authService', () => ({}));
jest.setTimeout(120000);
const font = readFileSync('public/fonts/NotoSansJP.ttf');
const fontBytes = () =>
  font.buffer.slice(
    font.byteOffset,
    font.byteOffset + font.byteLength
  ) as ArrayBuffer;
const roster = (count: number, name = (i: number) => `選手${i}`) => ({
  id: 't',
  name: '日本語チーム',
  userId: 'u',
  players: Array.from({ length: count }, (_, i) => ({
    id: String(i),
    name: name(i),
    number: String(i),
    position: '',
  })),
});
const sections = (count: number) => buildTeamReportStats([], roster(count));

let seq = 0;
const ab = (playerId: string, result: HitResult): AtBat => ({
  id: `ab-${seq++}`,
  playerId,
  result,
  inning: 1,
  isTop: false,
  rbi: 0,
  isOut: false,
});
const game = (
  id: string,
  date: string,
  gameType: GameType,
  team: TeamSetting,
  atBats: AtBat[]
): Game => ({
  id,
  date,
  gameType,
  currentInning: 1,
  homeTeam: {
    id: team.id,
    name: team.name,
    players: team.players
      .filter((p) => atBats.some((a) => a.playerId === p.id))
      .map((p) => ({ ...p, isActive: true, order: 1 })),
    atBats,
  },
  awayTeam: { id: 'rival', name: '相手', players: [], atBats: [] },
});

let encode: (text: string) => string;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embedded = await doc.embedFont(new Uint8Array(font), {
    subset: false,
  });
  encode = (text) =>
    embedded.encodeText(text).toString().slice(1, -1).toUpperCase();
});

// Each page's decoded content stream, so tests can look for the glyph runs drawn on it.
const pageContents = async (bytes: Uint8Array): Promise<string[]> => {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => pdf.context.lookup(ref))
        : [contents];
    return streams
      .map((stream) =>
        Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode())
          .toString('latin1')
          .toUpperCase()
      )
      .join('\n');
  });
};
const drawn = (content: string, text: string) =>
  content.includes(`<${encode(text)}>`);
const chartHeader = (label: string) => `日本語チーム｜${label}｜打撃成績の推移`;
const isChartPage = (content: string) =>
  ['公式戦', '練習試合', 'ジュニア戦'].some((label) =>
    drawn(content, chartHeader(label))
  );

test('keeps landscape A4 table pages and adds one chart page per two figures', async () => {
  for (const count of [0, 1, 30, 31, 100]) {
    const bytes = await createTeamStatsPdf(
      sections(count),
      [],
      fontBytes(),
      new Date('2026-11-07T00:00:00Z'),
      () => {}
    );
    const contents = await pageContents(bytes);
    const chartPages = contents.filter(isChartPage).length;
    expect(chartPages).toBe(3 * Math.ceil((count + 1) / 2));
    expect(contents.length - chartPages).toBeGreaterThanOrEqual(3);
    if (count < 2) expect(contents.length).toBe(6);
    const pdf = await PDFDocument.load(bytes);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(841.89);
      expect(page.getHeight()).toBeCloseTo(595.28);
    }
    contents.forEach((content, i) =>
      expect(drawn(content, `${i + 1} / ${contents.length}`)).toBe(true)
    );
  }
});

test('places team then player charts after each section, in table order, with shared ticks', async () => {
  const team = roster(2, (i) => ['長打者', '控え選手'][i]);
  const games = [
    game('g1', '2026-04-01', 'official', team, [ab('0', 'HR')]),
    game('g2', '2026-04-08', 'official', team, [
      ab('0', 'SO'),
      ab('ghost', 'IH'),
    ]),
    game('g3', '2026-05-01', 'practice', team, [ab('0', 'IH')]),
  ];
  const report = buildTeamReportStats(games, team);
  const contents = await pageContents(
    await createTeamStatsPdf(report, games, fontBytes(), new Date(), () => {})
  );
  const labels = ['公式戦', '練習試合', 'ジュニア戦'];
  expect(
    contents.map((c) => labels.find((l) => drawn(c, chartHeader(l))) ?? 'table')
  ).toEqual([
    'table',
    '公式戦',
    '公式戦',
    'table',
    '練習試合',
    '練習試合',
    'table',
    'ジュニア戦',
    'ジュニア戦',
  ]);

  const official = contents.slice(1, 3);
  const period = '対象期間: 2026-04-01〜2026-04-08（2試合）';
  const captions = [
    `チーム: 日本語チーム｜公式戦｜${period}`,
    ...report[0].playerStats.map((p) =>
      p.playerNumber
        ? `背番号${p.playerNumber} ${p.playerName}｜公式戦｜${period}`
        : `${p.playerName}｜公式戦｜${period}`
    ),
  ];
  expect(report[0].playerStats.map((p) => p.playerName)).toEqual([
    '長打者',
    '名簿にない選手 (ghost)',
    '控え選手',
  ]);
  captions.forEach((caption, figure) =>
    expect(drawn(official[Math.floor(figure / 2)], caption)).toBe(true)
  );
  expect(drawn(official[1], '打席記録なし')).toBe(true);
  for (const series of TREND_SERIES) {
    expect(drawn(official[0], series.label)).toBe(true);
  }
  const teamTicks = buildTrendScale(
    buildBattingTrend(games, 'official', { teamId: 't' })
  ).ticks.map(formatRate);
  expect(teamTicks).toEqual([
    '.000',
    '1.000',
    '2.000',
    '3.000',
    '4.000',
    '5.000',
  ]);
  for (const tick of teamTicks) expect(drawn(official[0], tick)).toBe(true);
  expect(drawn(official[0], '4/1')).toBe(true);
  expect(drawn(official[0], '4/8')).toBe(true);
  expect(drawn(contents[7], '試合記録なし')).toBe(true);
});

test('gives a long-named player a whole chart page instead of splitting the figure', async () => {
  const count = async (name: string) => {
    const team = roster(3, (i) => (i === 1 ? name : `選手${i}`));
    const games = [game('g1', '2026-04-01', 'official', team, [ab('1', 'IH')])];
    const report = buildTeamReportStats(games, team);
    const contents = await pageContents(
      await createTeamStatsPdf(report, games, fontBytes(), new Date(), () => {})
    );
    return contents.filter((c) => drawn(c, chartHeader('公式戦'))).length;
  };
  expect(await count('短い名前')).toBe(2);
  expect(await count('あ'.repeat(560))).toBe(3);
});

test('keeps every point for many players and games, thinning only the date labels', async () => {
  const team = roster(100);
  const games = Array.from({ length: 40 }, (_, i) =>
    game(
      `g${String(i).padStart(2, '0')}`,
      `2026-${String(4 + Math.floor(i / 28)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      'official',
      team,
      [ab('0', i % 3 ? 'SO' : 'IH'), ab('1', 'BB')]
    )
  );
  const report = buildTeamReportStats(games, team);
  const contents = await pageContents(
    await createTeamStatsPdf(report, games, fontBytes(), new Date(), () => {})
  );
  for (const label of ['公式戦', '練習試合', 'ジュニア戦']) {
    expect(contents.filter((c) => drawn(c, chartHeader(label)))).toHaveLength(
      51
    );
  }
  const firstChart = contents.findIndex((c) => drawn(c, chartHeader('公式戦')));
  expect(drawn(contents[firstChart], '4/1')).toBe(true);
  expect(drawn(contents[firstChart], '4/2')).toBe(false);
});

test('rejects unsupported glyphs, cancellation, and unusable dates instead of returning a partial file', async () => {
  const data = sections(1);
  data[0].teamName = '😀';
  await expect(
    createTeamStatsPdf(data, [], fontBytes(), new Date(), () => {})
  ).rejects.toThrow('文字');

  let total = 0;
  await createTeamStatsPdf(sections(3), [], fontBytes(), new Date(), () => {
    total++;
  });
  let calls = 0;
  await expect(
    createTeamStatsPdf(sections(3), [], fontBytes(), new Date(), () => {
      if (++calls > total - 3) throw new Error('中止');
    })
  ).rejects.toThrow('中止');

  const team = roster(1);
  const games = [game('broken', '', 'official', team, [ab('0', 'HR')])];
  await expect(
    createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {}
    )
  ).rejects.toThrow(/試合日付.*broken/);
});

test('rejects table headers below the printable area for long team names', async () => {
  const data = sections(0);
  data.forEach((section) => {
    section.teamName = 'あ'.repeat(1800);
  });
  await expect(
    createTeamStatsPdf(data, [], fontBytes(), new Date(), () => {})
  ).rejects.toThrow('ページ');
});

describe('playerRowCells', () => {
  const player = (
    over: Partial<PlayerBattingStats> = {}
  ): PlayerBattingStats => ({
    playerId: 'p',
    playerName: '選手',
    playerNumber: '1',
    playerPosition: '',
    gameCount: 3,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    rbis: 0,
    battingAvg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
    ...over,
  });
  // header: 背番号, 氏名, 登録試合数, 打席, 12 stat columns (last 4 are rates), 備考
  const RATE_FROM = 4 + 8;
  const rates = (cells: string[]) => cells.slice(RATE_FROM, RATE_FROM + 4);
  const counts = (cells: string[]) => cells.slice(4, 4 + 8);

  test('shows a dash for all four rates when a registered player has no plate appearance, keeping counts and remark', () => {
    const cells = playerRowCells('practice', player());
    expect(rates(cells)).toEqual(['—', '—', '—', '—']);
    expect(counts(cells)).toEqual(Array(8).fill('0'));
    expect(cells[2]).toBe('3');
    expect(cells[3]).toBe('0');
    expect(cells[cells.length - 1]).toBe('控え・打席なし');
  });

  test('keeps .000 for a player who batted without a hit', () => {
    const cells = playerRowCells(
      'practice',
      player({ plateAppearances: 3, atBats: 3, strikeouts: 3 })
    );
    expect(rates(cells)).toEqual(['.000', '.000', '.000', '.000']);
    expect(cells[cells.length - 1]).toBe('規定未到達');
  });

  test('keeps 1.000 on-base for a walk-only player (zero at-bats, nonzero plate appearances)', () => {
    const cells = playerRowCells(
      'practice',
      player({ plateAppearances: 2, walks: 2, obp: 1, ops: 1 })
    );
    expect(rates(cells)).toEqual(['.000', '1.000', '.000', '1.000']);
  });

  test('keeps dashing every column for a player with no registered games', () => {
    const cells = playerRowCells('official', player({ gameCount: 0 }));
    expect(cells.slice(3, 4 + 12)).toEqual(Array(13).fill('—'));
    expect(cells[cells.length - 1]).toBe('該当記録なし');
  });
});

test('says that a rate with a zero denominator is printed as .000', async () => {
  const contents = await pageContents(
    await createTeamStatsPdf(sections(1), [], fontBytes(), new Date(), () => {})
  );
  expect(
    drawn(
      contents[0],
      '登録試合数は保存名簿または打席に含まれる試合数です。実際の出場数ではありません。打数0で打席のある選手の打率・長打率は、分母0のため.000と表示します。'
    )
  ).toBe(true);
});
