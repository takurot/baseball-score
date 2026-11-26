import { PDFDocument, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PlayerBattingStats, TeamStats } from '../firebase/statsService';
import type { Game } from '../types';
import { meetsQualification } from '../utils/gameType';
import { drawTrendPages } from './TrendChartPdf';
import { addOutline } from './PdfNavigation';
import {
  Chapter,
  buildOutline,
  drawFrontPages,
  teamResultCells,
} from './TeamStatsPdfFront';
import {
  A4_LANDSCAPE,
  BOTTOM,
  LEFT,
  WIDTH,
  PAPER,
  card,
  drawFooter,
  drawPageHeader,
  drawPageNumber,
  headerLines,
  inkText,
  measureRow,
  rule,
  sectionTitle,
} from './TeamStatsPdfStyle';
import { buildBattingTrend } from './BattingStatsTrend';
import { formatRate, formatTrendPeriod } from './BattingTrendChart';
import { ScoreCalculator } from './ScoreCalculator';
import {
  DETAILED_PDF_OPTIONS,
  TeamStatsPdfOptions,
  describePeriod,
  validatePdfOptions,
} from './TeamStatsPdfOptions';

const labels = ['公式戦', '練習試合', 'ジュニア戦'];
const types = ['official', 'practice', 'junior'] as const;
const keys = [
  'atBats',
  'hits',
  'doubles',
  'triples',
  'homeRuns',
  'rbis',
  'walks',
  'sacrificeBunts',
  'sacrificeFlies',
  'strikeouts',
  'battingAvg',
  'obp',
  'slg',
  'ops',
] as const;
const headings = [
  '打数',
  '安打',
  '二塁打',
  '三塁打',
  '本塁打',
  '打点',
  '四死球',
  '犠打',
  '犠飛',
  '三振',
  '打率',
  '出塁率',
  '長打率',
  'OPS',
];
const RATE_START = 10;
const values = (s: TeamStats['battingStats']) =>
  keys.map((key, i) => (i >= RATE_START ? formatRate(s[key]) : String(s[key])));

// A registered player with no plate appearance has no rate to report, so the
// rates read "—" instead of a ".000" that looks like a hitless batter.
export const playerRowCells = (
  type: (typeof types)[number],
  player: PlayerBattingStats
): string[] => {
  const registered = player.gameCount > 0;
  const batted = player.plateAppearances > 0;
  const stats = registered
    ? values(player).map((value, i) =>
        i >= RATE_START && !batted ? '—' : value
      )
    : Array(keys.length).fill('—');
  return [
    player.playerNumber,
    player.playerName,
    String(player.gameCount),
    registered ? String(player.plateAppearances) : '—',
    ...stats,
    !registered
      ? '該当記録なし'
      : meetsQualification(type, player)
        ? '規定到達'
        : batted
          ? '規定未到達'
          : '控え・打席なし',
  ];
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// "YYYY-MM-DD HH:mm JST": the zone is kept so a reader can tell when it was issued.
export const formatIssuedAtJst = (issuedAt: Date): string => {
  if (Number.isNaN(issuedAt.getTime()))
    throw new Error('発行日時が不正なためPDFを作成できません');
  const jst = new Date(issuedAt.getTime() + JST_OFFSET_MS)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  return `${jst} JST`;
};

const LEDGER_HEADER = ['No.', '日付', '対戦相手', 'スコア', '結果', '試合ID'];
const LEDGER_WIDTHS = [34, 110, 220, 60, 40, 329];

const gameResult = (ours: number, theirs: number): string =>
  ours > theirs ? '勝' : ours < theirs ? '負' : '分';

export async function createTeamStatsPdf(
  sections: TeamStats[],
  games: readonly Game[],
  fontBytes: ArrayBuffer,
  issuedAt: Date,
  checkActive: () => void,
  options: TeamStatsPdfOptions = DETAILED_PDF_OPTIONS
): Promise<Uint8Array> {
  if (sections.length !== 3) throw new Error('3区分の成績が必要です');
  validatePdfOptions(options);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(new Uint8Array(fontBytes), {
    subset: false,
    // Noto's localized Latin digits are not in pdf-lib's full-font ToUnicode map.
    features: { locl: false },
  });
  const supported = new Set(font.getCharacterSet());
  const wrap = (text: string, width: number, size = 8): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const c of text) {
      if (c !== '\n' && !supported.has(c.codePointAt(0)!))
        throw new Error(`フォントで表示できない文字があります: ${c}`);
      if (c === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      if (font.widthOfTextAtSize(line + c, size) > width) {
        if (!line) throw new Error('文字が列幅に収まりません');
        lines.push(line);
        line = '';
      }
      line += c;
    }
    lines.push(line);
    return lines;
  };
  const ctx = { font, wrap };
  const chapters: Chapter[] = [];
  const stamp = formatIssuedAtJst(issuedAt);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  for (let index = 0; index < sections.length; index++) {
    const stats = sections[index];
    if (!options.types.includes(types[index])) continue;
    checkActive();
    // Same filter and order as the trend charts, so (1)/(2) in both places agree.
    const covered = buildBattingTrend(games, types[index], {
      teamId: stats.teamId,
    });
    let page!: PDFPage;
    let tablePage: PDFPage | undefined;
    let ledgerPage: PDFPage | undefined;
    let y = 0;
    const text = (value: string, size = 8) => {
      for (const line of wrap(value, WIDTH, size)) {
        if (y - size < BOTTOM)
          throw new Error(
            '見出しがページに収まりません。チーム名の長さを確認してください'
          );
        inkText(page, font, line, LEFT, y - size, size);
        y -= size + 4;
      }
    };
    const table = (
      cells: string[],
      widths: number[],
      style: Parameters<typeof measureRow>[3]
    ) => {
      y = measureRow(ctx, cells, widths, style).draw(page, y);
    };
    const title = (value: string) => {
      y = sectionTitle(page, font, value, y);
    };
    const open = (heading: string, role: string) => {
      page = pdf.addPage(A4_LANDSCAPE);
      y = drawPageHeader(page, font, headerLines(ctx, heading));
      drawFooter(page, font, `${labels[index]}｜${role}`);
    };
    const widths = [30, 132, 36, 30, ...Array(14).fill(34), 89];
    // Names and remarks stay left; all numeric columns share a right edge.
    const numericColumns = widths.map(
      (_, i) => i !== 1 && i < widths.length - 1
    );
    const header = [
      '背番号',
      '氏名',
      '登録\n試合数',
      '打席',
      ...headings,
      '備考',
    ];
    const playerGroups = [4 + RATE_START, widths.length - 1];
    const start = (continued: boolean) => {
      open(
        `${stats.teamName}｜${labels[index]}${continued ? '｜続き' : ''}`,
        continued ? '成績表・続き' : '成績表'
      );
      if (!continued) {
        tablePage = page;
        text(
          `対象期間: ${describePeriod(options.period)}　実際の対象: ${covered.length ? formatTrendPeriod(covered) : '試合なし'}　発行日時: ${stamp}`
        );
        text(
          '保存済みの試合をすべて集計しています。試合終了の確認はしていないため、入力途中の試合を含む場合があります。'
        );
        if (options.charts === 'none')
          text('グラフは出力していません（表のみ）。');
        y -= 8;
        title('チーム成績');
        if (!stats.gameCount) text('試合記録なし', 10);
        else {
          const gap = 6;
          const cardWidth = (WIDTH - 6 * gap) / 7;
          const results = teamResultCells(stats);
          ['試合数', '勝', '負', '分', '勝率', '得点', '失点'].forEach(
            (heading, i) => {
              const x = LEFT + i * (cardWidth + gap);
              const emphasis = i === 0 || i === 4;
              const value = results[i];
              const size = emphasis ? 16 : 13;
              card(
                page,
                x,
                y,
                cardWidth,
                43,
                emphasis ? PAPER.cream : PAPER.mist,
                i === 0 ? PAPER.gold : i === 4 ? PAPER.coral : PAPER.teal
              );
              inkText(page, font, heading, x + 11, y - 14, 9);
              inkText(
                page,
                font,
                value,
                x + cardWidth - 10 - font.widthOfTextAtSize(value, size),
                y - 34,
                size
              );
            }
          );
          y -= 55;
          title('チーム打撃成績');
          // Plate appearances can be checked against at-bats, walks, bunts, and flies.
          const battingWidths = [51, ...Array(14).fill(53)];
          const battingStyle = {
            numeric: battingWidths.map(() => true),
            groups: [RATE_START + 1],
          };
          table(['打席', ...headings], battingWidths, {
            ...battingStyle,
            header: true,
          });
          table(
            [String(stats.plateAppearances), ...values(stats.battingStats)],
            battingWidths,
            battingStyle
          );
        }
        y -= 12;
      }
      title(continued ? '個人成績（続き）' : '個人成績');
      if (!continued) {
        text(
          '登録試合数は保存名簿または打席に含まれる試合数です。実際の出場数ではありません。打数0で打席のある選手の打率・長打率は、分母0のため.000と表示します。'
        );
        text(
          index === 0
            ? '規定到達: 1打席以上（四死球・犠打・犠飛を含む）'
            : '規定到達: 10打数以上'
        );
        text(
          '並び順: 規定到達 → 規定未到達（打席なし・該当記録なしを含む）。各グループ内は背番号順'
        );
      }
      y -= 4;
      rule(page, LEFT, y, WIDTH, true);
      y -= 5;
      table(header, widths, {
        header: true,
        numeric: numericColumns,
        groups: playerGroups,
      });
    };
    start(false);
    let qualifiedAbove: boolean | null = null;
    for (let row = 0; row < stats.playerStats.length; row++) {
      const player = stats.playerStats[row];
      checkActive();
      const qualified = meetsQualification(types[index], player);
      const measured = measureRow(
        ctx,
        playerRowCells(types[index], player),
        widths,
        {
          stripe: row % 2 === 1,
          divider: qualifiedAbove === true && !qualified,
          numeric: numericColumns,
          groups: playerGroups,
        }
      );
      if (y - measured.height < BOTTOM) start(true);
      y = measured.draw(page, y);
      qualifiedAbove = qualified;
    }
    if (covered.length) {
      const ledgerNumeric = [true, false, false, true, false, false];
      const startLedger = (continued: boolean) => {
        open(
          `${stats.teamName}｜${labels[index]}｜対象試合一覧${continued ? '｜続き' : ''}`,
          continued ? '対象試合一覧・続き' : '対象試合一覧'
        );
        if (!continued) ledgerPage = page;
        text(
          '同日の試合は保存されたIDの順に (1)(2) と並べています。実際の開催順とは限りません。'
        );
        y -= 4;
        table(LEDGER_HEADER, LEDGER_WIDTHS, {
          header: true,
          numeric: ledgerNumeric,
        });
      };
      startLedger(false);
      covered.forEach((point, row) => {
        checkActive();
        const source = gamesById.get(point.game.id)!;
        const home = source.homeTeam.id === stats.teamId;
        const score = (side: 'homeTeam' | 'awayTeam') =>
          ScoreCalculator.calculateTotalScore(
            source[side],
            source.runEvents || [],
            side === 'awayTeam'
          );
        const ours = score(home ? 'homeTeam' : 'awayTeam');
        const theirs = score(home ? 'awayTeam' : 'homeTeam');
        const cells = [
          String(row + 1),
          point.game.label,
          point.game.opponentName,
          `${ours}-${theirs}`,
          gameResult(ours, theirs),
          point.game.id,
        ];
        const measured = measureRow(ctx, cells, LEDGER_WIDTHS, {
          stripe: row % 2 === 1,
          numeric: ledgerNumeric,
        });
        if (y - measured.height < BOTTOM) startLedger(true);
        y = measured.draw(page, y);
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const figures =
      options.charts === 'none'
        ? []
        : await drawTrendPages(
            { pdf, font, wrap, checkActive },
            stats,
            games,
            types[index],
            labels[index],
            {
              players: options.charts === 'all',
              omitEmpty: options.omitEmptyCharts,
            }
          );
    chapters.push({
      label: labels[index],
      stats,
      // start(false) above always ran, so the first table page exists
      table: tablePage!,
      ledger: ledgerPage,
      team: figures.find((figure) => figure.isTeam)?.page,
      players: figures.filter((figure) => !figure.isTeam),
    });
  }
  drawFrontPages(
    { pdf, ...ctx },
    {
      teamName: sections[0].teamName,
      stamp,
      options,
      chapters,
    }
  );
  addOutline(pdf, buildOutline(chapters));
  pdf
    .getPages()
    .forEach((page, i, pages) =>
      drawPageNumber(page, font, `${i + 1} / ${pages.length}`)
    );
  checkActive();
  const result = await pdf.save();
  checkActive();
  return result;
}
