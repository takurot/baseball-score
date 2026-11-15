import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import type { TeamStats } from '../firebase/statsService';
import { formatRate } from './BattingTrendChart';
import { OutlineNode, linkToPage } from './PdfNavigation';
import { TeamStatsPdfOptions, describePeriod } from './TeamStatsPdfOptions';

// Where one report type (公式戦 etc.) starts; only what was really drawn is set.
export interface Chapter {
  label: string;
  stats: TeamStats;
  table: PDFPage;
  ledger?: PDFPage;
  team?: PDFPage;
  players: { name: string; page: PDFPage }[];
}

export interface FrontContext {
  pdf: PDFDocument;
  font: PDFFont;
  wrap: (text: string, width: number, size?: number) => string[];
}

const LEFT = 24;
const WIDTH = 793;
const ROW = 14;
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
const SUMMARY_WIDTHS = [100, ...Array(11).fill(63)];
const HEADER_FILL = rgb(0.88, 0.88, 0.88);
const BORDER = rgb(0.6, 0.6, 0.6);

const summaryCells = ({ label, stats }: Chapter): string[] => {
  if (!stats.gameCount) return [label, ...Array(11).fill('—')];
  const decided = stats.wins + stats.losses;
  const bat = stats.battingStats;
  return [
    label,
    stats.gameCount,
    stats.wins,
    stats.losses,
    stats.draws,
    decided ? (stats.wins / decided).toFixed(3) : '—',
    stats.totalRuns,
    stats.totalRunsAllowed,
    formatRate(bat.battingAvg),
    formatRate(bat.obp),
    formatRate(bat.slg),
    formatRate(bat.ops),
  ].map(String);
};

const chartLabel = (options: TeamStatsPdfOptions): string =>
  options.charts === 'none'
    ? 'なし（表のみ）'
    : options.charts === 'team'
      ? 'チームのみ'
      : options.omitEmptyCharts
        ? 'チームと全選手（打席記録のない選手の枠は省略）'
        : 'チームと全選手';

// Summary and table of contents, drawn last so every page number is the real one.
export function drawFrontPage(
  { pdf, font, wrap }: FrontContext,
  page: PDFPage,
  input: {
    teamName: string;
    stamp: string;
    options: TeamStatsPdfOptions;
    chapters: Chapter[];
  }
): void {
  const { teamName, stamp, options, chapters } = input;
  let y = 565;
  const text = (value: string, size = 8, x = LEFT) => {
    for (const line of wrap(value, WIDTH, size)) {
      if (y < 35)
        throw new Error(
          '概要がページに収まりません。チーム名の長さを確認してください'
        );
      page.drawText(line, { x, y, size, font });
      y -= size + 4;
    }
  };

  text(`${teamName}｜チーム通算成績`, 12);
  text(`対象期間: ${describePeriod(options.period)}　発行日時: ${stamp}`);
  text(
    `出力区分: ${chapters.map((c) => c.label).join('・')}　グラフ: ${chartLabel(options)}`
  );
  y -= 6;

  text('区分別サマリー', 10);
  text(
    '区分は統合せず、区分ごとに表示します。詳しい数値は各区分の成績表を参照してください。'
  );
  const drawRow = (cells: string[], header: boolean) => {
    if (y - ROW < 35)
      throw new Error(
        '概要がページに収まりません。チーム名の長さを確認してください'
      );
    let x = LEFT;
    cells.forEach((cell, i) => {
      page.drawRectangle({
        x,
        y: y - ROW + 4,
        width: SUMMARY_WIDTHS[i],
        height: ROW,
        borderWidth: 0.3,
        borderColor: BORDER,
        ...(header && { color: HEADER_FILL }),
      });
      const width = font.widthOfTextAtSize(cell, 8);
      page.drawText(cell, {
        x: i === 0 ? x + 3 : x + SUMMARY_WIDTHS[i] - 3 - width,
        y: y - 6,
        size: 8,
        font,
      });
      x += SUMMARY_WIDTHS[i];
    });
    y -= ROW;
  };
  drawRow(SUMMARY_HEADER, true);
  chapters.forEach((chapter) => drawRow(summaryCells(chapter), false));
  y -= 12;

  text('目次', 10);
  const numberOf = (target: PDFPage) => pdf.getPages().indexOf(target) + 1;
  chapters.forEach((chapter) => {
    const entries: [string, PDFPage | undefined][] = [
      [`${chapter.label}　成績表`, chapter.table],
      [`${chapter.label}　対象試合一覧`, chapter.ledger],
      [`${chapter.label}　推移グラフ（チーム）`, chapter.team],
      [`${chapter.label}　推移グラフ（選手別）`, chapter.players[0]?.page],
    ];
    for (const [label, target] of entries) {
      if (!target) continue;
      if (y - ROW < 35)
        throw new Error(
          '目次がページに収まりません。チーム名の長さを確認してください'
        );
      const number = String(numberOf(target));
      page.drawText(label, { x: LEFT + 8, y, size: 8, font });
      page.drawText(number, {
        x: LEFT + WIDTH - font.widthOfTextAtSize(number, 8),
        y,
        size: 8,
        font,
      });
      linkToPage(
        pdf,
        page,
        { x: LEFT, y: y - 3, width: WIDTH, height: ROW },
        target
      );
      y -= ROW;
    }
  });
  y -= 8;
  text('指標の定義', 10);
  INDICATOR_DEFINITIONS.forEach((line) => text(line));
  if (chapters.some((chapter) => chapter.players.length)) {
    y -= 4;
    text(
      '選手別グラフは、目次の「推移グラフ（選手別）」から先頭の選手へ移動できます。個々の選手へはPDFビューアのブックマークから移動できます。'
    );
  }
}

// 表の数値を検算できるように、用語と計算式を1ページ目に載せる
export const INDICATOR_DEFINITIONS = [
  '打席 = 打数 + 四死球 + 犠打 + 犠飛。四死球は四球と死球の合計で、犠打・犠飛は打数に含めません。',
  '打率 = 安打 ÷ 打数　出塁率 = (安打 + 四死球) ÷ (打数 + 四死球 + 犠飛)　長打率 = 塁打 ÷ 打数　OPS = 出塁率 + 長打率　勝率 = 勝 ÷ (勝 + 負)',
  '分母が0のときの率は0として扱います。打席のない選手の率は「—」と表示します。',
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
