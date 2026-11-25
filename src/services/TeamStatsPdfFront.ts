import { PDFDocument, PDFPage } from 'pdf-lib';
import type { TeamStats } from '../firebase/statsService';
import { formatRate } from './BattingTrendChart';
import { OutlineNode, linkToPage } from './PdfNavigation';
import { TeamStatsPdfOptions, describePeriod } from './TeamStatsPdfOptions';
import {
  A4_LANDSCAPE,
  BOTTOM,
  LEFT,
  PAPER,
  PdfText,
  TOP,
  WIDTH,
  card,
  drawFooter,
  drawPageHeader,
  inkText,
  measureRow,
  rule,
  sectionTitle,
} from './TeamStatsPdfStyle';

// Where one report type (公式戦 etc.) starts; only what was really drawn is set.
export interface Chapter {
  label: string;
  stats: TeamStats;
  table: PDFPage;
  ledger?: PDFPage;
  team?: PDFPage;
  players: { name: string; page: PDFPage }[];
}

interface FrontContext extends PdfText {
  pdf: PDFDocument;
}

const SUMMARY_HEADER = [
  '区分',
  '試合数',
  '勝',
  '負',
  '分',
  '勝率',
  '得点',
  '失点',
  '打率',
  '出塁率',
  '長打率',
  'OPS',
];
const SUMMARY_WIDTHS = [133, ...Array(11).fill(60)];

export const teamResultCells = (stats: TeamStats): string[] => {
  const decided = stats.wins + stats.losses;
  return [
    stats.gameCount,
    stats.wins,
    stats.losses,
    stats.draws,
    decided ? (stats.wins / decided).toFixed(3) : '—',
    stats.totalRuns,
    stats.totalRunsAllowed,
  ].map(String);
};

const summaryCells = ({ label, stats }: Chapter): string[] => {
  if (!stats.gameCount) return [`${label}（記録なし）`, ...Array(11).fill('—')];
  const bat = stats.battingStats;
  return [
    label,
    ...teamResultCells(stats),
    formatRate(bat.battingAvg),
    formatRate(bat.obp),
    formatRate(bat.slg),
    formatRate(bat.ops),
  ];
};

const chartLabel = (options: TeamStatsPdfOptions): string =>
  options.charts === 'none'
    ? 'なし（表のみ）'
    : options.charts === 'team'
      ? 'チームのみ'
      : options.omitEmptyCharts
        ? 'チームと全選手（打席記録のない選手の枠は省略）'
        : 'チームと全選手';

// Insert overview pages before the detail pages; bind TOC destinations only once
// every insertion is done so printed numbers and reference destinations agree.
export function drawFrontPages(
  { pdf, font, wrap }: FrontContext,
  {
    teamName,
    stamp,
    options,
    chapters,
  }: {
    teamName: string;
    stamp: string;
    options: TeamStatsPdfOptions;
    chapters: Chapter[];
  }
): void {
  let count = 0;
  const open = () => {
    const page = pdf.insertPage(count++, A4_LANDSCAPE);
    drawFooter(page, font, count === 1 ? '概要' : '概要・続き');
    return page;
  };
  let page = open();
  let y = TOP;
  const ensure = (height: number) => {
    if (y - height >= BOTTOM) return;
    page = open();
    y = drawPageHeader(page, font, ['チーム通算成績｜概要（続き）']);
  };
  const title = (value: string) => {
    y = sectionTitle(page, font, value, y);
  };
  const line = (value: string) => {
    inkText(page, font, value, LEFT, y - 8);
    y -= 13;
  };

  const teamLines = wrap(teamName, WIDTH - 40, 16);
  const metadata = [
    `対象期間: ${describePeriod(options.period)}　発行日時: ${stamp}`,
    `出力区分: ${chapters.map((c) => c.label).join('・')}　グラフ: ${chartLabel(options)}`,
  ].flatMap((text) => wrap(text, WIDTH - 40, 10));
  const heroHeight = 55 + teamLines.length * 21 + metadata.length * 14;
  if (y - heroHeight < BOTTOM)
    throw new Error(
      '概要がページに収まりません。チーム名の長さを確認してください'
    );
  card(page, LEFT, y, WIDTH, heroHeight, PAPER.cream, PAPER.teal);
  inkText(page, font, 'チーム通算成績', LEFT + 20, y - 33, 25);
  let baseline = y - 58;
  for (const text of teamLines) {
    inkText(page, font, text, LEFT + 20, baseline, 16);
    baseline -= 21;
  }
  for (const text of metadata) {
    inkText(page, font, text, LEFT + 20, baseline, 10);
    baseline -= 14;
  }
  y -= heroHeight + 20;

  const numeric = SUMMARY_WIDTHS.map((_, i) => i !== 0);
  const rows = [
    measureRow({ font, wrap }, SUMMARY_HEADER, SUMMARY_WIDTHS, {
      header: true,
      numeric,
      groups: [8],
    }),
    ...chapters.map((chapter, i) =>
      measureRow({ font, wrap }, summaryCells(chapter), SUMMARY_WIDTHS, {
        stripe: i % 2 === 1,
        numeric,
        groups: [8],
      })
    ),
  ];
  const summaryNotes = wrap(
    '区分は統合せず、区分ごとに表示します。詳しい数値は各区分の成績表を参照してください。',
    WIDTH
  );
  ensure(
    19 +
      13 * summaryNotes.length +
      rows.reduce((sum, row) => sum + row.height, 0)
  );
  title('区分別サマリー');
  summaryNotes.forEach(line);
  for (const row of rows) y = row.draw(page, y);
  y -= 17;

  const gap = 8;
  const boxWidth = (WIDTH - gap * (chapters.length - 1)) / chapters.length;
  const groups = chapters.map((chapter) => {
    const entries = [
      { label: '成績表', target: chapter.table },
      { label: '対象試合一覧', target: chapter.ledger },
      { label: '推移グラフ（チーム）', target: chapter.team },
      { label: '推移グラフ（選手別）', target: chapter.players[0]?.page },
    ];
    return entries.flatMap(({ label, target }) =>
      target
        ? [
            {
              target,
              lines: wrap(`${chapter.label}　${label}`, boxWidth - 48, 9),
            },
          ]
        : []
    );
  });
  const rowHeight = (lines: string[]) => 8 + 13 * lines.length;
  const boxHeight =
    12 +
    Math.max(
      ...groups.map((group) =>
        group.reduce((sum, item) => sum + rowHeight(item.lines), 0)
      )
    );
  ensure(19 + boxHeight);
  title('目次');
  const linkPage = page;
  const links: { target: PDFPage; x: number; top: number; height: number }[] =
    [];
  groups.forEach((group, i) => {
    const x = LEFT + i * (boxWidth + gap);
    card(page, x, y, boxWidth, boxHeight, PAPER.cream, PAPER.teal);
    let top = y - 6;
    group.forEach(({ target, lines }, row) => {
      if (row) rule(page, x + 10, top, boxWidth - 18, true);
      lines.forEach((text, j) =>
        inkText(page, font, text, x + 12, top - 14 - j * 13, 9)
      );
      const height = rowHeight(lines);
      links.push({ target, x, top, height });
      top -= height;
    });
  });
  y -= boxHeight + 17;

  const definitions = [...INDICATOR_DEFINITIONS];
  if (chapters.some((chapter) => chapter.players.length)) {
    definitions.push(
      '選手別グラフは、目次の「推移グラフ（選手別）」から先頭の選手へ移動できます。個々の選手へはPDFビューアのブックマークから移動できます。'
    );
  }
  const definitionLines = definitions.flatMap((text) => wrap(text, WIDTH));
  ensure(19 + 13 * definitionLines.length);
  title('指標の定義');
  definitionLines.forEach(line);

  const numberOf = new Map(
    pdf.getPages().map((target, i) => [target, String(i + 1)])
  );
  for (const { target, x, top, height } of links) {
    const number = numberOf.get(target)!;
    inkText(
      linkPage,
      font,
      number,
      x + boxWidth - 10 - font.widthOfTextAtSize(number, 9),
      top - 14,
      9
    );
    linkToPage(
      pdf,
      linkPage,
      { x: x + 8, y: top - height, width: boxWidth - 16, height },
      target
    );
  }
}

export const INDICATOR_DEFINITIONS = [
  '打席 = 打数 + 四死球 + 犠打 + 犠飛。四死球は四球と死球の合計で、犠打・犠飛は打数に含めません。',
  '打率 = 安打 ÷ 打数　出塁率 = (安打 + 四死球) ÷ (打数 + 四死球 + 犠飛)　長打率 = 塁打 ÷ 打数　OPS = 出塁率 + 長打率　勝率 = 勝 ÷ (勝 + 負)',
  '分母が0のときの打率・出塁率・長打率は0として扱います。打席のない選手の率と、勝敗のない区分の勝率は「—」と表示します。',
  '率は四捨五入する前の値で計算し、最後に小数第3位まで表示します。表示された出塁率と長打率の和が OPS と .001 異なることがありますが、誤りではありません。',
];

export const buildOutline = (chapters: Chapter[]): OutlineNode[] =>
  chapters.map((chapter) => ({
    title: chapter.label,
    page: chapter.table,
    children: [
      { title: '成績表', page: chapter.table },
      ...(chapter.ledger
        ? [{ title: '対象試合一覧', page: chapter.ledger }]
        : []),
      ...(chapter.team
        ? [{ title: '推移グラフ（チーム）', page: chapter.team }]
        : []),
      ...chapter.players.map(({ name, page }) => ({ title: name, page })),
    ],
  }));
