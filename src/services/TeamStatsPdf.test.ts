import { readFileSync } from 'fs';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import {
  createTeamStatsPdf,
  formatIssuedAtJst,
  playerRowCells,
} from './TeamStatsPdf';
import {
  buildTeamReportStats,
  PlayerBattingStats,
} from '../firebase/statsService';
import { buildBattingTrend } from './BattingStatsTrend';
import {
  DETAILED_PDF_OPTIONS,
  filterGamesByPeriod,
  TeamStatsPdfOptions,
} from './TeamStatsPdfOptions';
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
let measure: (text: string, size?: number) => number;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embedded = await doc.embedFont(new Uint8Array(font), {
    subset: false,
    features: { locl: false },
  });
  encode = (text) =>
    embedded.encodeText(text).toString().slice(1, -1).toUpperCase();
  measure = (text, size = 8) => embedded.widthOfTextAtSize(text, size);
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

test('opens the real PDF with a distinct report title before the team name and the summary', async () => {
  const [front] = await pageContents(
    await createTeamStatsPdf(sections(1), [], fontBytes(), new Date(), () => {})
  );
  const title = rowYs(front, 'チーム通算成績')[0];
  const team = rowYs(front, '日本語チーム')[0];
  const summary = rowYs(front, '区分別サマリー')[0];
  expect(title).toBeGreaterThan(team);
  expect(team).toBeGreaterThan(summary);
});

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
    // summary page + 3 x (table + 2 chart pages)
    if (count < 2) expect(contents.length).toBe(7);
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
    contents.map(
      (c) =>
        (drawn(c, 'チーム通算成績') ? 'front' : undefined) ??
        labels.find((l) => drawn(c, chartHeader(l))) ??
        (labels.some((l) => drawn(c, `日本語チーム｜${l}｜対象試合一覧`))
          ? 'ledger'
          : 'table')
    )
  ).toEqual([
    'front',
    'table',
    'ledger',
    '公式戦',
    '公式戦',
    'table',
    'ledger',
    '練習試合',
    '練習試合',
    'table',
    'ジュニア戦',
    'ジュニア戦',
  ]);

  const official = contents.slice(3, 5);
  const period = (unit: string) =>
    `対象期間: 2026-04-01〜2026-04-08（${unit}2試合）`;
  // [plate appearances, at-bats, games with a plate appearance] per player, in table order
  const volumes = [
    [2, 2, 2],
    [1, 1, 1],
    [0, 0, 0],
  ];
  const captions = [
    `チーム: 日本語チーム｜公式戦｜${period('')}｜累積3打席/3打数`,
    ...report[0].playerStats.map((p, i) => {
      const [pa, atBats, played] = volumes[i];
      const name = p.playerNumber
        ? `背番号${p.playerNumber} ${p.playerName}`
        : p.playerName;
      return `${name}｜公式戦｜${period('チーム対象')}｜累積${pa}打席/${atBats}打数｜打席あり${played}試合`;
    }),
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
  // the legend carries each metric's final cumulative value next to the chart
  const finalRates = buildBattingTrend(games, 'official', { teamId: 't' })[1]
    .rates!;
  const rowY = (text: string) =>
    Array.from(
      official[0].matchAll(
        new RegExp(`1 0 0 1 [\\d.]+ ([\\d.]+) TM\\s*<${encode(text)}> TJ`, 'g')
      )
    ).map((m) => m[1]);
  for (const series of TREND_SERIES) {
    const labelRows = rowY(series.label);
    // two figures share the page; the team's legend is drawn first
    expect(labelRows).toHaveLength(2);
    // the value sits on the legend row itself, not only on an axis tick
    expect(rowY(formatRate(finalRates[series.metric]))).toContain(labelRows[0]);
    if (series.dash.length) {
      // Both the plotted stroke and the legend sample for each figure use this dash.
      const dashOperator = `[${series.dash.join(' ')}] 0 D`;
      expect(official[0].split(dashOperator).length - 1).toBe(4);
    }
  }
  expect(
    drawn(
      official[0],
      '凡例の数値は最終試合時点の累積値です。下段の●はその試合で打席が追加された試合、○は打席がなく前の値を維持した試合（初打席前を含む）です。'
    )
  ).toBe(true);
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
  expect(drawn(contents[10], '試合記録なし')).toBe(true);
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
    sacrificeBunts: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    rbis: 0,
    battingAvg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
    ...over,
  });
  // header: 背番号, 氏名, 登録試合数, 打席, 14 stat columns (last 4 are rates), 備考
  const RATE_FROM = 4 + 10;
  const rates = (cells: string[]) => cells.slice(RATE_FROM, RATE_FROM + 4);
  const counts = (cells: string[]) => cells.slice(4, 4 + 10);

  test('shows a dash for all four rates when a registered player has no plate appearance, keeping counts and remark', () => {
    const cells = playerRowCells('practice', player());
    expect(rates(cells)).toEqual(['—', '—', '—', '—']);
    expect(counts(cells)).toEqual(Array(10).fill('0'));
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
    expect(cells.slice(3, 4 + 14)).toEqual(Array(15).fill('—'));
    expect(cells[cells.length - 1]).toBe('該当記録なし');
  });
});

// y of every run of exactly `text` on a page, highest first
const rowYs = (content: string, text: string): number[] =>
  Array.from(
    content.matchAll(
      new RegExp(`1 0 0 1 [\\d.]+ ([\\d.]+) TM\\s*<${encode(text)}> TJ`, 'g')
    )
  )
    .map((m) => Number(m[1]))
    .sort((a, b) => b - a);

const pdfColor = (...channels: number[]) =>
  channels.map((channel) => PDFNumber.of(channel / 255).toString()).join(' ');
const tableHeaderFill = `${pdfColor(232, 246, 245)} RG`;
const tableStripeFill = `${pdfColor(246, 248, 248)} RG`;

describe('table layout', () => {
  const practiceTablePage = async (
    atBatCounts: number[],
    gameType: GameType = 'practice'
  ) => {
    const team = roster(atBatCounts.length);
    const games = [
      game(
        'g1',
        '2026-04-01',
        gameType,
        team,
        atBatCounts.flatMap((n, i) =>
          Array.from({ length: n }, () => ab(String(i), 'SO'))
        )
      ),
    ];
    const contents = await pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        new Date('2026-11-15T00:00:00Z'),
        () => {}
      )
    );
    // Section 2 (練習試合) starts with its table page, right after the 公式戦 pages.
    const first = contents.findIndex((c) => drawn(c, '日本語チーム｜練習試合'));
    return contents[first];
  };
  const xsOf = (content: string, text: string) =>
    Array.from(
      content.matchAll(
        new RegExp(`1 0 0 1 ([\\d.]+) [\\d.]+ TM\\s*<${encode(text)}> TJ`, 'g')
      )
    ).map((m) => Number(m[1]));

  test('breaks the 登録試合数 heading at a word boundary instead of orphaning 数', async () => {
    const page = await practiceTablePage([1]);
    expect(drawn(page, '登録')).toBe(true);
    expect(drawn(page, '試合数')).toBe(true);
    expect(drawn(page, '登録試合')).toBe(false);
  });

  test('explains the order of the player rows', async () => {
    const page = await practiceTablePage([1]);
    expect(
      drawn(
        page,
        '並び順: 規定到達 → 規定未到達（打席なし・該当記録なしを含む）。各グループ内は背番号順'
      )
    ).toBe(true);
  });

  test('shades heading rows and alternating player rows with distinct pale fills', async () => {
    const page = await practiceTablePage([1, 1, 1]);
    expect(page).toContain(tableHeaderFill);
    expect(page).toContain(tableStripeFill);
  });

  test('right-aligns numeric cells so digits of different widths share a right edge', async () => {
    const page = await practiceTablePage([1, 10]);
    const wantedShift = measure('10') - measure('1');
    const aligned = xsOf(page, '1').some((one) =>
      xsOf(page, '10').some((ten) => Math.abs(one - ten - wantedShift) < 0.01)
    );
    expect(aligned).toBe(true);
  });

  test('draws a group divider only where qualified rows give way to unqualified ones', async () => {
    const divider = `${pdfColor(23, 59, 58)} RG\n1.1 W`;
    const page = await practiceTablePage([1, 10]);
    // exactly one divider, on the top edge of the first unqualified row (player 0, below player 1)
    expect(page.split(divider)).toHaveLength(2);
    const y = Number(
      /([\d.]+) ([\d.]+) M/.exec(page.slice(page.indexOf(divider)))![2]
    );
    expect(y).toBeCloseTo(rowYs(page, '選手0')[0] + 10);
    expect(y).toBeLessThan(rowYs(page, '選手1')[0]);
    expect(await practiceTablePage([1, 2])).not.toContain(divider);
    expect(await practiceTablePage([10, 11])).not.toContain(divider);
  });

  test('draws every row of a 15-player roster with long names and two-digit counts', async () => {
    const name = (i: number) => `長い名前の選手${i}`;
    const team = roster(15, name);
    const games = [
      game(
        'g1',
        '2026-04-01',
        'practice',
        team,
        team.players.flatMap((p) =>
          Array.from({ length: 12 }, () => ab(p.id, 'IH'))
        )
      ),
    ];
    const bytes = await createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {}
    );
    const contents = await pageContents(bytes);
    // createTeamStatsPdf throws if a cell cannot fit, so reaching here means no clipping;
    // also require that every player's row (and its 12 at-bats) really was drawn.
    // the official section lists the same players with dashes, so look at the practice pages only
    const practice = contents.filter(
      (c) =>
        drawn(c, '日本語チーム｜練習試合') ||
        drawn(c, '日本語チーム｜練習試合｜続き')
    );
    for (let i = 0; i < 15; i++) {
      const page = practice.find((c) => drawn(c, name(i)));
      expect(page).toBeDefined();
      // the 12 at-bats sit on the player's own row (player 12's number is also "12", so skip it)
      if (i === 12) continue;
      expect(rowYs(page!, '12')).toContain(rowYs(page!, name(i))[0]);
    }
  });

  test('stacks a name that wraps over several lines and moves the next row down by that height', async () => {
    // the name column is 132pt wide (126pt usable): 15 full-width characters per line
    const wrapped = 'あ'.repeat(15);
    const team = roster(3, (i) => (i === 1 ? wrapped.repeat(3) : `選手${i}`));
    const page = (
      await pageContents(
        await createTeamStatsPdf(
          buildTeamReportStats([], team),
          [],
          fontBytes(),
          new Date(),
          () => {}
        )
      )
    ).find((c) => drawn(c, '日本語チーム｜練習試合'))!;
    const lines = rowYs(page, wrapped);
    expect(lines).toHaveLength(3);
    expect(lines[0] - lines[1]).toBeCloseTo(11);
    expect(lines[1] - lines[2]).toBeCloseTo(11);
    // row height = 3 lines x 11 + 8
    expect(lines[0] - rowYs(page, '選手2')[0]).toBeCloseTo(3 * 11 + 8);
  });

  test.each([11, 12, 66])(
    'keeps all %i roster rows in order across exact page boundaries',
    async (count) => {
      const team = roster(count);
      const games = [
        game(
          'g1',
          '2026-04-01',
          'official',
          team,
          team.players.map((p) => ab(p.id, 'SO'))
        ),
      ];
      const report = buildTeamReportStats(games, team);
      const contents = await pageContents(
        await createTeamStatsPdf(
          report,
          games,
          fontBytes(),
          new Date(),
          () => {},
          { ...DETAILED_PDF_OPTIONS, types: ['official'], charts: 'none' }
        )
      );
      const tables = contents.filter((c) => drawn(c, '氏名'));
      expect(tables).toHaveLength(count === 11 ? 1 : count === 12 ? 2 : 4);
      expect(drawn(tables[0], 'チーム成績')).toBe(true);
      for (const page of tables.slice(1)) {
        expect(drawn(page, '個人成績（続き）')).toBe(true);
        expect(drawn(page, 'チーム成績')).toBe(false);
        expect(drawn(page, '備考')).toBe(true);
        expect(drawn(page, '試合数')).toBe(true);
      }
      const rows = tables.map((c) =>
        report[0].playerStats
          .flatMap(({ playerName }) =>
            rowYs(c, playerName).map((y) => ({ playerName, y }))
          )
          .sort((a, b) => b.y - a.y)
      );
      expect(rows[0]).toHaveLength(11);
      expect(
        rows.every((page) => page.length && page.every(({ y }) => y > 35))
      ).toBe(true);
      expect(rows.flat().map(({ playerName }) => playerName)).toEqual(
        report[0].playerStats.map((p) => p.playerName)
      );
    }
  );

  test('repeats the shaded heading row on continuation pages', async () => {
    const team = roster(30);
    const games = [
      game(
        'g1',
        '2026-04-01',
        'practice',
        team,
        team.players.flatMap((p) => [ab(p.id, 'IH')])
      ),
    ];
    const contents = await pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        new Date(),
        () => {}
      )
    );
    const continued = contents.filter((c) =>
      drawn(c, '日本語チーム｜練習試合｜続き')
    );
    expect(continued.length).toBeGreaterThan(0);
    for (const page of continued) {
      expect(page).toContain(tableHeaderFill);
      expect(drawn(page, '試合数')).toBe(true);
    }
  });
});

describe('issued-at time', () => {
  test('formats in JST with the zone shown, rolling the date over across midnight', () => {
    expect(formatIssuedAtJst(new Date('2026-11-14T16:30:00Z'))).toBe(
      '2026-11-15 01:30 JST'
    );
    expect(formatIssuedAtJst(new Date('2026-11-15T00:00:00Z'))).toBe(
      '2026-11-15 09:00 JST'
    );
    expect(formatIssuedAtJst(new Date('2026-12-31T15:05:00Z'))).toBe(
      '2027-01-01 00:05 JST'
    );
  });

  test('refuses an invalid date instead of printing NaN', () => {
    expect(() => formatIssuedAtJst(new Date('nope'))).toThrow('発行日時');
  });
});

describe('game ledger and scope note', () => {
  const withScores = (
    g: Game,
    ours: number,
    theirs: number,
    opponent = '相手'
  ): Game => ({
    ...g,
    homeTeam: {
      ...g.homeTeam,
      atBats: g.homeTeam.atBats.map((a, i) => ({
        ...a,
        rbi: i === 0 ? ours : 0,
      })),
    },
    awayTeam: {
      ...g.awayTeam,
      name: opponent,
      atBats: theirs ? [{ ...ab('x', 'IH'), rbi: theirs }] : [],
    },
  });
  const team = roster(2);
  // Two games on 04-01 (ids deliberately out of order) and one unnamed opponent on 04-08.
  const ledgerGames = (): Game[] => [
    withScores(
      game('b-game', '2026-04-01', 'official', team, [ab('0', 'HR')]),
      1,
      1
    ),
    withScores(
      game('a-game', '2026-04-01', 'official', team, [ab('0', 'HR')]),
      3,
      2
    ),
    withScores(
      game('c-game', '2026-04-08', 'official', team, [ab('0', 'SO')]),
      0,
      4,
      '  '
    ),
  ];
  const build = async (
    games: Game[],
    issuedAt = new Date('2026-11-14T16:30:00Z')
  ) =>
    pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        issuedAt,
        () => {}
      )
    );
  const yOf = (content: string, text: string) =>
    Array.from(
      content.matchAll(
        new RegExp(`1 0 0 1 [\\d.]+ ([\\d.]+) TM\\s*<${encode(text)}> TJ`, 'g')
      )
    ).map((m) => Number(m[1]));
  const ledgerHeader = (label: string) =>
    `日本語チーム｜${label}｜対象試合一覧`;

  test('states the all-period condition, the dates actually covered, the count and the issue time in JST', async () => {
    const contents = await build(ledgerGames());
    // table is the summary page; the official table follows it
    const table = contents.find((c) => drawn(c, '日本語チーム｜公式戦'))!;
    expect(
      drawn(
        table,
        '対象期間: 全期間　実際の対象: 2026-04-01〜2026-04-08（3試合）　発行日時: 2026-11-15 01:30 JST'
      )
    ).toBe(true);
    expect(
      drawn(
        table,
        '保存済みの試合をすべて集計しています。試合終了の確認はしていないため、入力途中の試合を含む場合があります。'
      )
    ).toBe(true);
  });

  test('lists the covered games in chart order with opponent, score, result and game id', async () => {
    const contents = await build(ledgerGames());
    const ledger = contents.find((c) => drawn(c, ledgerHeader('公式戦')))!;
    expect(ledger).toBeDefined();
    for (const text of [
      '2026-04-01 (1)',
      '2026-04-01 (2)',
      '2026-04-08',
      'a-game',
      'b-game',
      'c-game',
      '相手未設定',
      '3-2',
      '1-1',
      '0-4',
    ]) {
      expect(drawn(ledger, text)).toBe(true);
    }
    // top-to-bottom = descending y; same-date games follow the stored-ID order of the charts.
    const row = (id: string) => yOf(ledger, id)[0];
    expect(row('a-game')).toBeGreaterThan(row('b-game'));
    expect(row('b-game')).toBeGreaterThan(row('c-game'));
    // each result sits on its own game's row
    expect(yOf(ledger, '勝')[0]).toBeCloseTo(row('a-game'));
    expect(yOf(ledger, '分')[0]).toBeCloseTo(row('b-game'));
    expect(yOf(ledger, '負')[0]).toBeCloseTo(row('c-game'));
    expect(
      drawn(
        ledger,
        '同日の試合は保存されたIDの順に (1)(2) と並べています。実際の開催順とは限りません。'
      )
    ).toBe(true);
  });

  test('lists exactly as many games as the section counts, and omits the ledger when there are none', async () => {
    const games = ledgerGames();
    expect(buildTeamReportStats(games, team)[0].gameCount).toBe(3);
    const contents = await build(games);
    expect(
      contents.filter((c) => drawn(c, ledgerHeader('公式戦')))
    ).toHaveLength(1);
    // practice and junior have no games: no ledger page, and the scope line says so
    expect(contents.some((c) => drawn(c, ledgerHeader('練習試合')))).toBe(
      false
    );
    const practiceTable = contents.find((c) =>
      drawn(c, '日本語チーム｜練習試合')
    )!;
    expect(
      drawn(
        practiceTable,
        '対象期間: 全期間　実際の対象: 試合なし　発行日時: 2026-11-15 01:30 JST'
      )
    ).toBe(true);
  });

  test('continues the ledger over several pages without dropping a game', async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      game(
        `g${String(i).padStart(2, '0')}`,
        `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
        'official',
        team,
        [ab('0', 'SO')]
      )
    );
    const contents = await build(many);
    const pages = contents.filter(
      (c) =>
        drawn(c, ledgerHeader('公式戦')) ||
        drawn(c, `${ledgerHeader('公式戦')}｜続き`)
    );
    expect(pages.length).toBeGreaterThan(1);
    for (let i = 0; i < 60; i++) {
      const id = `g${String(i).padStart(2, '0')}`;
      expect(pages.filter((c) => drawn(c, id))).toHaveLength(1);
    }
    // the first page carries the plain title, every later page is marked as a continuation
    expect(drawn(pages[0], ledgerHeader('公式戦'))).toBe(true);
    for (const page of pages.slice(1)) {
      expect(drawn(page, `${ledgerHeader('公式戦')}｜続き`)).toBe(true);
    }
    // rows keep the chart order (date, then id) across the page break
    const order = pages
      .flatMap((page) =>
        Array.from({ length: 60 }, (_, i) => `g${String(i).padStart(2, '0')}`)
          .filter((id) => drawn(page, id))
          .map((id) => ({ id, y: yOf(page, id)[0] }))
          .sort((a, b) => b.y - a.y)
          .map((row) => row.id)
      )
      .map((id) => Number(id.slice(1)));
    const expected = Array.from({ length: 60 }, (_, i) => i).sort(
      (a, b) => (a % 28) - (b % 28) || a - b
    );
    expect(order).toEqual(expected);
  });

  test('keeps the letters and digits of a game ID in the PDF Unicode map', async () => {
    const id = 'demo-02';
    const games = [game(id, '2026-05-01', 'official', team, [ab('0', 'SO')])];
    const bytes = await createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {},
      { ...DETAILED_PDF_OPTIONS, types: ['official'], charts: 'none' }
    );
    const contents = await pageContents(bytes);
    const ledger = contents.findIndex((c) => drawn(c, '試合ID'));
    const idGlyphs = Array.from(contents[ledger].matchAll(/<([\dA-F]+)> TJ/g))
      .map((match) => match[1])
      .find(
        (glyphs) =>
          glyphs.length === id.length * 4 && glyphs.startsWith(encode('demo-'))
      )!;
    expect(idGlyphs).toBeDefined();
    const doc = await PDFDocument.load(bytes);
    const fonts = doc
      .getPage(ledger)
      .node.Resources()!
      .lookup(PDFName.of('Font'), PDFDict);
    const fontDict = doc.context.lookup(fonts.entries()[0][1], PDFDict);
    const cmap = fontDict.lookup(PDFName.of('ToUnicode')) as PDFRawStream;
    const unicode = Buffer.from(decodePDFRawStream(cmap).decode()).toString(
      'ascii'
    );
    Array.from(id).forEach((letter, i) => {
      const utf16 = letter.charCodeAt(0).toString(16).padStart(4, '0');
      expect(unicode).toMatch(
        new RegExp(`<${idGlyphs.slice(i * 4, i * 4 + 4)}>\\s*<${utf16}>`, 'i')
      );
    });
  });

  test('wraps a long Japanese game ID as one complete row at the ledger boundary', async () => {
    const idLine = '試'.repeat(40);
    const id = idLine.repeat(2) + '末尾識別子';
    const many = Array.from({ length: 24 }, (_, i) =>
      game(
        i === 23 ? id : `a${String(i).padStart(2, '0')}`,
        '2026-05-01',
        'official',
        team,
        [ab('0', 'SO')]
      )
    );
    const pages = (await build(many)).filter((c) => drawn(c, '試合ID'));
    expect(pages).toHaveLength(2);
    expect(drawn(pages[1], `${ledgerHeader('公式戦')}｜続き`)).toBe(true);
    const baselines = rowYs(pages[1], idLine);
    expect(baselines).toHaveLength(2);
    expect(baselines[0] - baselines[1]).toBe(11);
    expect(rowYs(pages[1], '末尾識別子')[0]).toBe(baselines[1] - 11);
    expect(rowYs(pages[1], '相手')).toEqual([baselines[0]]);
    expect(rowYs(pages[0], idLine)).toEqual([]);
  });

  test('scores an away game from our side, including run events', async () => {
    const base = game('away-game', '2026-06-01', 'official', team, [
      ab('0', 'SO'),
    ]);
    const away: Game = {
      ...base,
      homeTeam: { ...base.awayTeam, name: '先攻でない相手', atBats: [] },
      awayTeam: base.homeTeam,
      runEvents: [
        ...[5, 1].map((runCount, i) => ({
          id: `re-${i}`,
          inning: 1,
          isTop: i === 0,
          runType: 'その他' as const,
          runCount,
          timestamp: null,
        })),
      ],
    };
    const contents = await build([away]);
    const ledger = contents.find((c) => drawn(c, ledgerHeader('公式戦')))!;
    // our side is the away team: top-inning run event (5) vs bottom (1) -> win 5-1
    expect(drawn(ledger, '5-1')).toBe(true);
    expect(drawn(ledger, '勝')).toBe(true);
    expect(drawn(ledger, '先攻でない相手')).toBe(true);
  });
});

// The stream is upper-cased, so a fill colour reads as RG; dots are the 0.6-wide circles.
const dotsOn = (chart: string) => {
  const ink = pdfColor(23, 59, 58);
  const white = '1 1 1';
  const circles = chart.matchAll(
    /^((?:[\d.]+ ){2}[\d.]+) RG\n((?:[\d.]+ ){2}[\d.]+) RG\n0\.6 W\n\[\] 0 D\nQ\n([\d.]+) [\d.]+ M/gm
  );
  return Array.from(circles)
    .filter(
      ([, fill, stroke]) => stroke === ink && (fill === ink || fill === white)
    )
    .map(([, fill, , x]) => ({ filled: fill === ink, x: Number(x) }));
};

test('marks each game under the chart as filled when it added plate appearances and hollow when the value is only carried forward', async () => {
  const team = roster(1);
  const games = [
    game('g1', '2026-04-01', 'official', team, [ab('0', 'SO')]),
    game('g2', '2026-04-08', 'official', team, []),
    game('g3', '2026-04-15', 'official', team, [ab('0', 'IH')]),
  ];
  const contents = await pageContents(
    await createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {}
    )
  );
  const chart = contents.find((c) => drawn(c, chartHeader('公式戦')))!;
  const dots = dotsOn(chart);
  // team figure then the player's figure, each: filled, hollow (no turn in g2), filled
  expect(dots.map((dot) => dot.filled)).toEqual([
    true,
    false,
    true,
    true,
    false,
    true,
  ]);
  // left to right in game order within each figure, at the same x in both figures
  for (const figure of [dots.slice(0, 3), dots.slice(3)]) {
    expect(figure[0].x).toBeLessThan(figure[1].x);
    expect(figure[1].x).toBeLessThan(figure[2].x);
  }
  expect(dots.slice(0, 3).map((dot) => dot.x)).toEqual(
    dots.slice(3).map((dot) => dot.x)
  );
  expect(drawn(chart, '打席')).toBe(true);
});

describe('output options', () => {
  const team = roster(3);
  const games = [
    game('g1', '2026-04-01', 'official', team, [ab('0', 'HR')]),
    game('g2', '2026-05-10', 'official', team, [ab('0', 'SO'), ab('1', 'IH')]),
    game('g3', '2026-05-20', 'practice', team, [ab('0', 'IH')]),
  ];
  const build = async (
    options: Partial<TeamStatsPdfOptions> = {},
    source: readonly Game[] = games
  ) => {
    const merged = { ...DETAILED_PDF_OPTIONS, ...options };
    const used = filterGamesByPeriod(source, merged.period);
    return pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats([...used], team),
        used,
        fontBytes(),
        new Date('2026-11-14T16:30:00Z'),
        () => {},
        merged
      )
    );
  };
  const has = (contents: string[], text: string) =>
    contents.some((c) => drawn(c, text));

  test('keeps the detailed report when no options are given', async () => {
    const contents = await pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        new Date(),
        () => {}
      )
    );
    for (const label of ['公式戦', '練習試合', 'ジュニア戦']) {
      expect(has(contents, chartHeader(label))).toBe(true);
    }
    expect(
      has(
        contents,
        '背番号2 選手2｜公式戦｜対象期間: 2026-04-01〜2026-05-10（チーム対象2試合）｜累積0打席/0打数｜打席あり0試合'
      )
    ).toBe(true);
  });

  test('outputs only the chosen types', async () => {
    const contents = await build({ types: ['practice'] });
    expect(has(contents, '日本語チーム｜練習試合')).toBe(true);
    expect(has(contents, '日本語チーム｜公式戦')).toBe(false);
    expect(has(contents, '日本語チーム｜ジュニア戦')).toBe(false);
    expect(contents.filter(isChartPage).length).toBeGreaterThan(0);
  });

  test('prints every player in the tables and no chart page when tables only', async () => {
    const contents = await build({ charts: 'none' });
    expect(contents.some(isChartPage)).toBe(false);
    const official = contents.find((c) => drawn(c, '日本語チーム｜公式戦'))!;
    for (const name of ['選手0', '選手1', '選手2']) {
      expect(drawn(official, name)).toBe(true);
    }
    expect(drawn(official, 'グラフは出力していません（表のみ）。')).toBe(true);
    for (const label of ['公式戦', '練習試合', 'ジュニア戦']) {
      expect(has(contents, `日本語チーム｜${label}`)).toBe(true);
    }
  });

  test('draws only the team figure and says the players are left out', async () => {
    const contents = await build({ charts: 'team', types: ['official'] });
    const charts = contents.filter(isChartPage);
    expect(charts).toHaveLength(1);
    expect(
      drawn(
        charts[0],
        'チーム: 日本語チーム｜公式戦｜対象期間: 2026-04-01〜2026-05-10（2試合）｜累積3打席/3打数'
      )
    ).toBe(true);
    expect(
      has(
        charts,
        '背番号0 選手0｜公式戦｜対象期間: 2026-04-01〜2026-05-10（チーム対象2試合）｜累積2打席/2打数｜打席あり2試合'
      )
    ).toBe(false);
    expect(
      drawn(
        charts[0],
        '選手別グラフは出力していません。成績表には全選手を掲載しています。'
      )
    ).toBe(true);
  });

  test('omits only the frames of players without a plate appearance and says how many', async () => {
    const full = await build({ types: ['official'] });
    const caption2 =
      '背番号2 選手2｜公式戦｜対象期間: 2026-04-01〜2026-05-10（チーム対象2試合）｜累積0打席/0打数｜打席あり0試合';
    expect(has(full, caption2)).toBe(true);

    const lean = await build({ types: ['official'], omitEmptyCharts: true });
    expect(has(lean, caption2)).toBe(false);
    expect(
      has(
        lean,
        '背番号0 選手0｜公式戦｜対象期間: 2026-04-01〜2026-05-10（チーム対象2試合）｜累積2打席/2打数｜打席あり2試合'
      )
    ).toBe(true);
    expect(
      has(
        lean,
        '背番号1 選手1｜公式戦｜対象期間: 2026-04-01〜2026-05-10（チーム対象2試合）｜累積1打席/1打数｜打席あり1試合'
      )
    ).toBe(true);
    expect(has(lean, '打席記録なし')).toBe(false);
    expect(
      has(
        lean,
        '打席記録のない選手1名のグラフ枠は省略しています。成績表には全選手を掲載しています。'
      )
    ).toBe(true);
    // the table keeps the player the charts left out
    const table = lean.find((c) => drawn(c, '日本語チーム｜公式戦'))!;
    expect(drawn(table, '選手2')).toBe(true);
  });

  test('rebuilds tables, ledger and charts from the games inside the period', async () => {
    const period = { start: '2026-05-01', end: '2026-05-31' };
    const contents = await build({ period });
    const official = contents.find((c) => drawn(c, '日本語チーム｜公式戦'))!;
    expect(
      drawn(
        official,
        '対象期間: 2026-05-01〜2026-05-31　実際の対象: 2026-05-10（1試合）　発行日時: 2026-11-15 01:30 JST'
      )
    ).toBe(true);
    // the April game is gone from the ledger and from the chart
    expect(has(contents, 'g1')).toBe(false);
    expect(has(contents, 'g2')).toBe(true);
    expect(
      has(
        contents,
        '背番号0 選手0｜公式戦｜対象期間: 2026-05-10（チーム対象1試合）｜累積1打席/1打数｜打席あり1試合'
      )
    ).toBe(true);
  });

  test('still produces every section when the period holds no game', async () => {
    const contents = await build({ period: { start: '2027-01-01' } });
    const official = contents.find((c) => drawn(c, '日本語チーム｜公式戦'))!;
    expect(
      drawn(
        official,
        '対象期間: 2027-01-01以降　実際の対象: 試合なし　発行日時: 2026-11-15 01:30 JST'
      )
    ).toBe(true);
    expect(has(contents, '日本語チーム｜公式戦｜対象試合一覧')).toBe(false);
    expect(has(contents, '試合記録なし')).toBe(true);
  });

  test('rejects unusable options before drawing anything', async () => {
    await expect(
      createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        new Date(),
        () => {},
        { ...DETAILED_PDF_OPTIONS, types: [] }
      )
    ).rejects.toThrow('区分');
  });

  test('keeps the qualification rule and player identity in the simple output', async () => {
    const same = [game('h1', '2026-04-01', 'practice', team, [ab('0', 'SO')])];
    const contents = await build({ charts: 'none', types: ['practice'] }, same);
    const page = contents.find((c) => drawn(c, '日本語チーム｜練習試合'))!;
    expect(drawn(page, '規定到達: 10打数以上')).toBe(true);
    expect(drawn(page, '規定未到達')).toBe(true);
  });
});

describe('summary page and navigation', () => {
  const marks = (n: number) => roster(n);
  const gamesFor = (team: ReturnType<typeof roster>): Game[] => [
    game('g1', '2026-04-01', 'official', team, [ab('0', 'HR')]),
    game('g2', '2026-05-10', 'official', team, [ab('0', 'SO'), ab('1', 'IH')]),
    game('g3', '2026-05-20', 'practice', team, [ab('0', 'IH')]),
  ];
  const make = async (
    players: number,
    options: Partial<TeamStatsPdfOptions> = {},
    source: (team: ReturnType<typeof roster>) => Game[] = gamesFor,
    teamName?: string
  ) => {
    const team = marks(players);
    if (teamName) team.name = teamName;
    const merged = { ...DETAILED_PDF_OPTIONS, ...options };
    // like the export dialog: tables, ledger and charts share the period-filtered games
    const games = [...filterGamesByPeriod(source(team), merged.period)];
    const report = buildTeamReportStats(games, team);
    const bytes = await createTeamStatsPdf(
      report,
      games,
      fontBytes(),
      new Date('2026-11-14T16:30:00Z'),
      () => {},
      merged
    );
    return {
      bytes,
      report,
      contents: await pageContents(bytes),
      doc: await PDFDocument.load(bytes),
    };
  };
  const yOf = (content: string, text: string) =>
    Array.from(
      content.matchAll(
        new RegExp(`1 0 0 1 [\\d.]+ ([\\d.]+) TM\\s*<${encode(text)}> TJ`, 'g')
      )
    ).map((m) => Number(m[1]));
  // a caption is one long run; match its beginning
  const startsWith = (content: string, text: string) =>
    content.includes(`<${encode(text)}`);
  const num = (value: unknown) => (value as { asNumber(): number }).asNumber();
  const pageOf = (doc: PDFDocument, dest: PDFArray) =>
    doc.getPages().findIndex((page) => page.ref === dest.get(0));
  const frontLinks = (doc: PDFDocument) =>
    doc.getPages().flatMap((page, i) =>
      (page.node.Annots()?.asArray() ?? []).map((ref) => {
        const link = doc.context.lookup(ref, PDFDict);
        const rect = link
          .lookup(PDFName.of('Rect'), PDFArray)
          .asArray()
          .map(num);
        return {
          source: i,
          left: rect[0],
          bottom: rect[1],
          right: rect[2],
          top: rect[3],
          page: pageOf(doc, link.lookup(PDFName.of('Dest'), PDFArray)),
        };
      })
    );
  const pointsOf = (content: string, text: string) =>
    Array.from(
      content.matchAll(
        new RegExp(
          `1 0 0 1 ([\\d.]+) ([\\d.]+) TM\\s*<${encode(text)}> TJ`,
          'g'
        )
      )
    ).map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  const entry = (
    { contents, doc }: Awaited<ReturnType<typeof make>>,
    label: string
  ) => {
    const link = frontLinks(doc).find((link) =>
      pointsOf(contents[link.source], label).some(
        ({ x, y }) =>
          link.left <= x && x <= link.right && link.bottom <= y && y <= link.top
      )
    );
    expect(link).toBeDefined();
    return {
      page: link!.page,
      source: link!.source,
      printed: pointsOf(contents[link!.source], String(link!.page + 1)).some(
        ({ x, y }) =>
          link!.left <= x &&
          x <= link!.right &&
          link!.bottom <= y &&
          y <= link!.top
      ),
    };
  };

  test('keeps links and printed destinations in sync after inserting an overview continuation', async () => {
    const name = '青'.repeat(545) + '長い架空野球部';
    const out = await make(3, {}, gamesFor, name);
    expect(drawn(out.contents[0], '区分別サマリー')).toBe(true);
    expect(drawn(out.contents[1], 'チーム通算成績｜概要（続き）')).toBe(true);
    const links = frontLinks(out.doc);
    expect(links).toHaveLength(11);
    expect(
      links.every(
        ({ source, left, bottom, right, top, page }) =>
          source === 1 &&
          left >= 24 &&
          bottom > 35 &&
          right < 818 &&
          top < 572 &&
          page >= 2
      )
    ).toBe(true);
    const table = entry(out, '公式戦　成績表');
    expect(table).toMatchObject({ page: 2, source: 1, printed: true });
    expect(drawn(out.contents[table.page], 'チーム成績')).toBe(true);
    const ledger = entry(out, '公式戦　対象試合一覧');
    expect(ledger.printed).toBe(true);
    expect(drawn(out.contents[ledger.page], '試合ID')).toBe(true);
    const chart = entry(out, '練習試合　推移グラフ（選手別）');
    expect(chart.printed).toBe(true);
    expect(
      startsWith(out.contents[chart.page], '背番号0 選手0｜練習試合')
    ).toBe(true);
    const root = out.doc.catalog.lookup(PDFName.of('Outlines'), PDFDict);
    const official = root.lookup(PDFName.of('First'), PDFDict);
    expect(pageOf(out.doc, official.lookup(PDFName.of('Dest'), PDFArray))).toBe(
      table.page
    );
    expect(drawn(out.contents[0], `1 / ${out.contents.length}`)).toBe(true);
    expect(drawn(out.contents[1], `2 / ${out.contents.length}`)).toBe(true);
  });

  test('opens with a per-type summary that keeps the three types apart', async () => {
    const out = await make(3);
    const front = out.contents[0];
    expect(drawn(front, 'チーム通算成績')).toBe(true);
    expect(
      drawn(front, '対象期間: 全期間　発行日時: 2026-11-15 01:30 JST')
    ).toBe(true);
    // one row per type, no combined total row
    expect(drawn(front, '合計')).toBe(false);
    out.report.forEach((stats, i) => {
      const label = ['公式戦', '練習試合', 'ジュニア戦'][i];
      const row = yOf(front, stats.gameCount ? label : `${label}（記録なし）`);
      expect(row).toHaveLength(1);
      const cells = stats.gameCount
        ? [
            stats.gameCount,
            stats.wins,
            stats.losses,
            stats.draws,
            stats.wins + stats.losses
              ? (stats.wins / (stats.wins + stats.losses)).toFixed(3)
              : '—',
            stats.totalRuns,
            stats.totalRunsAllowed,
            formatRate(stats.battingStats.battingAvg),
            formatRate(stats.battingStats.obp),
            formatRate(stats.battingStats.slg),
            formatRate(stats.battingStats.ops),
          ].map(String)
        : Array(11).fill('—');
      cells.forEach((cell) => expect(yOf(front, cell)).toContain(row[0]));
    });
  });

  test('lists each chapter with the page it really starts on and links to it', async () => {
    const out = await make(3);
    const expected: [string, string][] = [
      ['公式戦　成績表', '個人成績'],
      ['公式戦　対象試合一覧', '日本語チーム｜公式戦｜対象試合一覧'],
      ['公式戦　推移グラフ（チーム）', 'チーム: 日本語チーム｜公式戦'],
      ['公式戦　推移グラフ（選手別）', '背番号0 選手0｜公式戦'],
      ['練習試合　成績表', '個人成績'],
      ['練習試合　対象試合一覧', '日本語チーム｜練習試合｜対象試合一覧'],
      ['練習試合　推移グラフ（チーム）', 'チーム: 日本語チーム｜練習試合'],
      ['練習試合　推移グラフ（選手別）', '背番号0 選手0｜練習試合'],
      ['ジュニア戦　成績表', '個人成績'],
      ['ジュニア戦　推移グラフ（チーム）', 'チーム: 日本語チーム｜ジュニア戦'],
      ['ジュニア戦　推移グラフ（選手別）', '背番号0 選手0｜ジュニア戦'],
    ];
    for (const [label, marker] of expected) {
      const { page, printed } = entry(out, label);
      expect(printed).toBe(true);
      expect(page).toBeGreaterThan(0);
      expect(startsWith(out.contents[page], marker)).toBe(true);
    }
    // a type without a game has no ledger, so no ledger entry is offered
    expect(yOf(out.contents[0], 'ジュニア戦　対象試合一覧')).toEqual([]);
    expect(frontLinks(out.doc)).toHaveLength(expected.length);
  });

  test('keeps the numbers right when many players add pages', async () => {
    const out = await make(100);
    for (const label of ['公式戦　成績表', '練習試合　推移グラフ（選手別）']) {
      expect(entry(out, label).printed).toBe(true);
    }
    const table = entry(out, '練習試合　成績表').page;
    expect(drawn(out.contents[table], '日本語チーム｜練習試合')).toBe(true);
    const last = out.contents.length;
    expect(drawn(out.contents[last - 1], `${last} / ${last}`)).toBe(true);
    expect(drawn(out.contents[0], `1 / ${last}`)).toBe(true);
  });

  test('lists only what the simple output produces', async () => {
    const out = await make(3, {
      types: ['practice'],
      charts: 'team',
    });
    expect(yOf(out.contents[0], '公式戦')).toEqual([]);
    expect(yOf(out.contents[0], '練習試合')).toHaveLength(1);
    expect(entry(out, '練習試合　成績表').printed).toBe(true);
    expect(entry(out, '練習試合　推移グラフ（チーム）').printed).toBe(true);
    expect(yOf(out.contents[0], '練習試合　推移グラフ（選手別）')).toEqual([]);

    const tablesOnly = await make(3, { charts: 'none' });
    expect(yOf(tablesOnly.contents[0], '公式戦　推移グラフ（チーム）')).toEqual(
      []
    );
    expect(entry(tablesOnly, '公式戦　対象試合一覧').printed).toBe(true);
  });

  test('adds bookmarks down to each charted player', async () => {
    const { doc, contents } = await make(3);
    const outlines = doc.catalog.lookup(PDFName.of('Outlines'), PDFDict);
    const title = (item: PDFDict) =>
      (item.lookup(PDFName.of('Title')) as PDFHexString).decodeText();
    const children = (item: PDFDict) => {
      const out: PDFDict[] = [];
      let next: PDFDict | undefined = item.lookup(PDFName.of('First'), PDFDict);
      while (next) {
        out.push(next);
        next = next.lookupMaybe(PDFName.of('Next'), PDFDict);
      }
      return out;
    };
    const top = children(outlines);
    expect(top.map(title)).toEqual(['公式戦', '練習試合', 'ジュニア戦']);
    const official = children(top[0]);
    expect(official.map(title)).toEqual([
      '成績表',
      '対象試合一覧',
      '推移グラフ（チーム）',
      '背番号0 選手0',
      '背番号1 選手1',
      '背番号2 選手2',
    ]);
    const player = official[3];
    const page = pageOf(doc, player.lookup(PDFName.of('Dest'), PDFArray));
    expect(startsWith(contents[page], '背番号0 選手0｜公式戦')).toBe(true);
  });

  test('keeps the contents and bookmarks right when a period leaves a type without games', async () => {
    const out = await make(3, { period: { start: '2026-05-15' } });
    const front = out.contents[0];
    // only the practice game (05-20) is inside the period
    expect(yOf(front, '公式戦　対象試合一覧')).toEqual([]);
    expect(entry(out, '公式戦　成績表').printed).toBe(true);
    expect(entry(out, '練習試合　対象試合一覧').printed).toBe(true);
    const ledger = entry(out, '練習試合　対象試合一覧').page;
    expect(
      startsWith(out.contents[ledger], '日本語チーム｜練習試合｜対象試合一覧')
    ).toBe(true);
    // the official summary row shows dashes
    const row = yOf(front, '公式戦（記録なし）')[0];
    expect(yOf(front, '—')).toContain(row);
    expect(
      drawn(front, '対象期間: 2026-05-15以降　発行日時: 2026-11-15 01:30 JST')
    ).toBe(true);
  });

  test('points the contents and bookmarks at the first player that is really charted', async () => {
    // player 0 never bats, so omitting empty frames starts the player charts at player 1
    const batting = (team: ReturnType<typeof roster>): Game[] => [
      game('g1', '2026-04-01', 'official', team, [ab('1', 'HR')]),
      game('g2', '2026-05-10', 'official', team, [ab('2', 'SO')]),
    ];
    const out = await make(3, { omitEmptyCharts: true }, batting);
    const first = entry(out, '公式戦　推移グラフ（選手別）').page;
    expect(startsWith(out.contents[first], '背番号1 選手1｜公式戦')).toBe(true);
    expect(drawn(out.contents[0], '練習試合　推移グラフ（選手別）')).toBe(
      false
    );
    const outlines = out.doc.catalog.lookup(PDFName.of('Outlines'), PDFDict);
    const titles = (item: PDFDict) => {
      const names: string[] = [];
      let next: PDFDict | undefined = item.lookup(PDFName.of('First'), PDFDict);
      while (next) {
        names.push(
          (next.lookup(PDFName.of('Title')) as PDFHexString).decodeText()
        );
        next = next.lookupMaybe(PDFName.of('Next'), PDFDict);
      }
      return names;
    };
    const official = outlines.lookup(PDFName.of('First'), PDFDict);
    expect(titles(official)).toEqual([
      '成績表',
      '対象試合一覧',
      '推移グラフ（チーム）',
      '背番号1 選手1',
      '背番号2 選手2',
    ]);
  });

  test('mentions the player charts only when the PDF has them', async () => {
    const sentence =
      '選手別グラフは、目次の「推移グラフ（選手別）」から先頭の選手へ移動できます。個々の選手へはPDFビューアのブックマークから移動できます。';
    expect(drawn((await make(3)).contents[0], sentence)).toBe(true);
    for (const options of [
      { charts: 'team' as const },
      { charts: 'none' as const },
    ]) {
      expect(drawn((await make(3, options)).contents[0], sentence)).toBe(false);
    }
  });

  test('tells the reader where the player charts are reached', async () => {
    const { contents } = await make(3);
    expect(
      drawn(
        contents[0],
        '選手別グラフは、目次の「推移グラフ（選手別）」から先頭の選手へ移動できます。個々の選手へはPDFビューアのブックマークから移動できます。'
      )
    ).toBe(true);
  });
});

test('says that a rate with a zero denominator is printed as .000', async () => {
  const contents = await pageContents(
    await createTeamStatsPdf(sections(1), [], fontBytes(), new Date(), () => {})
  );
  expect(
    drawn(
      // contents[0] is the summary page; the first table page follows it
      contents.find((c) => drawn(c, '日本語チーム｜公式戦'))!,
      '登録試合数は保存名簿または打席に含まれる試合数です。実際の出場数ではありません。打数0で打席のある選手の打率・長打率は、分母0のため.000と表示します。'
    )
  ).toBe(true);
});

test('marks a late first plate appearance and a one-game figure', async () => {
  const team = roster(2);
  const games = [
    game('g1', '2026-04-01', 'official', team, [ab('0', 'SO')]),
    game('g2', '2026-04-08', 'official', team, [ab('0', 'SO'), ab('1', 'IH')]),
  ];
  const contents = await pageContents(
    await createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {}
    )
  );
  const charts = contents.filter((c) => drawn(c, chartHeader('公式戦')));
  const all = charts.flatMap(dotsOn);
  // team: filled, filled; player 0: filled, filled; player 1 (first turn in g2): hollow, filled
  expect(all.map((dot) => dot.filled)).toEqual([
    true,
    true,
    true,
    true,
    false,
    true,
  ]);

  const single = [game('s1', '2026-04-01', 'official', team, [ab('0', 'HR')])];
  const one = await pageContents(
    await createTeamStatsPdf(
      buildTeamReportStats(single, team),
      single,
      fontBytes(),
      new Date(),
      () => {}
    )
  );
  const chart = one.find((c) => drawn(c, chartHeader('公式戦')))!;
  expect(dotsOn(chart)).toHaveLength(2);
  expect(
    chart.includes(
      `<${encode('背番号0 選手0｜公式戦｜対象期間: 2026-04-01（チーム対象1試合）｜累積1打席/1打数｜打席あり1試合')}>`
    )
  ).toBe(true);
});

const denseChart = async (count: number) => {
  const team = roster(1);
  const games = Array.from({ length: count }, (_, i) =>
    game(
      `g${String(i).padStart(3, '0')}`,
      '2026-12-31',
      'official',
      team,
      i % 2 === 0 ? [ab('0', 'SO')] : []
    )
  );
  const contents = await pageContents(
    await createTeamStatsPdf(
      buildTeamReportStats(games, team),
      games,
      fontBytes(),
      new Date(),
      () => {},
      { ...DETAILED_PDF_OPTIONS, charts: 'team', types: ['official'] }
    )
  );
  return contents.find((c) => drawn(c, chartHeader('公式戦')))!;
};

test.each([122, 123, 124, 125, 170])(
  'preserves the PDF appearance marker density boundary at %i games',
  async (count) => {
    const chart = await denseChart(count);
    const visible = count <= 124;
    expect(dotsOn(chart).map(({ filled }) => filled)).toEqual(
      visible ? Array.from({ length: count }, (_, i) => i % 2 === 0) : []
    );
    expect(drawn(chart, '打席')).toBe(visible);
    expect(
      drawn(
        chart,
        '試合数が多い図では、点が重なるため下段の●/○を省略しています。'
      )
    ).toBe(!visible);
  }
);

test('keeps the final long date label inside the chart frame', async () => {
  const chart = await denseChart(127);
  const label = '12/31 (127)';
  const previous = '12/31 (118)';
  const labelX = (text: string) => {
    const match = new RegExp(
      `1 0 0 1 ([\\d.]+) [\\d.]+ TM\\s*<${encode(text)}> TJ`
    ).exec(chart);
    expect(match).not.toBeNull();
    return Number(match![1]);
  };
  // The 793pt figure frame starts 24pt from the left edge.
  expect(labelX(label) + measure(label)).toBeLessThanOrEqual(24 + 793);
  expect(labelX(label) - labelX(previous) - measure(previous)).toBeGreaterThan(
    2
  );
});

describe('sacrifice bunts, flies and indicator definitions', () => {
  const at = (id: string, playerId: string, result: HitResult): AtBat => ({
    ...ab(playerId, result),
    id,
  });
  const team = roster(2);
  // player 0: 11 at-bats with 3 hits (a triple and two singles) -> OBP 3/11, SLG 5/11;
  //   plus one sacrifice bunt, one sacrifice fly and one walk
  // player 1: one sacrifice bunt only
  const bats: AtBat[] = [
    at('1', '0', '3B'),
    at('2', '0', 'IH'),
    at('3', '0', 'IH'),
    ...Array.from({ length: 8 }, (_, i) => at(`o${i}`, '0', 'GO_SS')),
    at('s1', '0', 'SAC'),
    at('f1', '0', 'SF'),
    at('w1', '0', 'BB'),
    at('s2', '1', 'SAC'),
  ];
  const games = [game('g1', '2026-04-01', 'practice', team, bats)];
  const build = async () =>
    pageContents(
      await createTeamStatsPdf(
        buildTeamReportStats(games, team),
        games,
        fontBytes(),
        new Date('2026-11-14T16:30:00Z'),
        () => {}
      )
    );
  const rowYs = (content: string, text: string) =>
    Array.from(
      content.matchAll(
        new RegExp(`1 0 0 1 [\\d.]+ ([\\d.]+) TM\\s*<${encode(text)}> TJ`, 'g')
      )
    ).map((m) => Number(m[1]));

  test('puts 犠打 and 犠飛 next to 四死球 in the player and team tables, and 打席 in the team table', async () => {
    const contents = await build();
    const page = contents.find((c) => drawn(c, '日本語チーム｜練習試合'))!;
    // header of the team batting table and of the player table
    expect(rowYs(page, '犠打')).toHaveLength(2);
    expect(rowYs(page, '犠飛')).toHaveLength(2);
    expect(rowYs(page, '四死球')).toHaveLength(2);
    // the team row sits one header-row height (19pt) below the team table's header
    const teamHeaderY = Math.max(...rowYs(page, '犠打'));
    const teamRowY = teamHeaderY - 19;
    expect(rowYs(page, '15')).toContain(teamRowY); // 打席
    expect(rowYs(page, '11')).toContain(teamRowY); // 打数
    expect(rowYs(page, '2')).toContain(teamRowY); // 犠打 (player 0 and player 1)
    expect(rowYs(page, '1')).toContain(teamRowY); // 犠飛
    const team = buildTeamReportStats(games, roster(2))[1];
    expect(team.plateAppearances).toBe(15);
    const b = team.battingStats;
    expect(b.atBats + b.walks + b.sacrificeBunts + b.sacrificeFlies).toBe(15);
  });

  test("shows the player's breakdown so 打席 = 打数 + 四死球 + 犠打 + 犠飛 can be checked on the row", () => {
    const [, practice] = buildTeamReportStats(games, team);
    const first = practice.playerStats.find((p) => p.playerId === '0')!;
    const cells = playerRowCells('practice', first);
    // 打席, 打数, 安打, 二塁打, 三塁打, 本塁打, 打点, 四死球, 犠打, 犠飛
    const [pa, ab11, , , , , , walks, bunts, flies] = cells
      .slice(3, 13)
      .map(Number);
    expect([pa, ab11, walks, bunts, flies]).toEqual([14, 11, 1, 1, 1]);
    expect(ab11 + walks + bunts + flies).toBe(pa);
  });

  test('prints OBP/SLG/OPS from unrounded values: .308 + .455 shows .763 but OPS is .762', async () => {
    const contents = await build();
    const page = contents.find((c) => drawn(c, '日本語チーム｜練習試合'))!;
    const y = rowYs(page, '選手0')[0];
    // OBP = (3 + 1) / (11 + 1 + 1) = .3077, SLG = 5 / 11 = .4545, OPS = .7622
    expect(rowYs(page, '.308')).toContain(y);
    expect(rowYs(page, '.455')).toContain(y);
    expect(rowYs(page, '.762')).toContain(y);
    expect(rowYs(page, '.763')).not.toContain(y);
  });

  test('states the definitions, the zero-denominator rule and the rounding rule on the first page', async () => {
    const front = (await build())[0];
    for (const line of [
      '指標の定義',
      '打席 = 打数 + 四死球 + 犠打 + 犠飛。四死球は四球と死球の合計で、犠打・犠飛は打数に含めません。',
      '打率 = 安打 ÷ 打数　出塁率 = (安打 + 四死球) ÷ (打数 + 四死球 + 犠飛)　長打率 = 塁打 ÷ 打数　OPS = 出塁率 + 長打率　勝率 = 勝 ÷ (勝 + 負)',
      '分母が0のときの打率・出塁率・長打率は0として扱います。打席のない選手の率と、勝敗のない区分の勝率は「—」と表示します。',
      '率は四捨五入する前の値で計算し、最後に小数第3位まで表示します。表示された出塁率と長打率の和が OPS と .001 異なることがありますが、誤りではありません。',
    ]) {
      expect(drawn(front, line)).toBe(true);
    }
  });
});
