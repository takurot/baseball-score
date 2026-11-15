import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PlayerBattingStats, TeamStats } from '../firebase/statsService';
import type { Game } from '../types';
import { meetsQualification } from '../utils/gameType';
import { drawTrendPages } from './TrendChartPdf';
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
  '三振',
  '打率',
  '出塁率',
  '長打率',
  'OPS',
];
const HEADER_FILL = rgb(0.88, 0.88, 0.88);
const STRIPE_FILL = rgb(0.93, 0.93, 0.93);
const DIVIDER = rgb(0.35, 0.35, 0.35);
const RATE_START = 8;
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
const LEDGER_WIDTHS = [34, 110, 220, 60, 40, 326];

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
    let page: PDFPage;
    let y = 0;
    const text = (value: string, size = 8) => {
      const lines = wrap(value, 790, size);
      for (const line of lines) {
        if (y < 35)
          throw new Error(
            '見出しがページに収まりません。チーム名の長さを確認してください'
          );
        page.drawText(line, { x: 24, y, font, size });
        y -= size + 4;
      }
    };
    interface RowStyle {
      header?: boolean;
      stripe?: boolean;
      divider?: boolean;
      right?: boolean[];
    }
    const table = (
      cells: string[],
      widths: number[],
      draw = true,
      style: RowStyle = {}
    ) => {
      const lines = cells.map((cell, i) => wrap(cell, widths[i] - 6));
      const height = Math.max(...lines.map((l) => l.length)) * 11 + 8;
      if (draw) {
        if (y - height < 35)
          throw new Error(
            '表がページに収まりません。チーム名や項目の長さを確認してください'
          );
        const fill = style.header
          ? HEADER_FILL
          : style.stripe
            ? STRIPE_FILL
            : undefined;
        let x = 24;
        lines.forEach((cell, i) => {
          page.drawRectangle({
            x,
            y: y - height + 4,
            width: widths[i],
            height,
            borderWidth: 0.3,
            borderColor: rgb(0.6, 0.6, 0.6),
            ...(fill && { color: fill }),
          });
          cell.forEach((line, j) =>
            page.drawText(line, {
              x: style.right?.[i]
                ? x + widths[i] - 3 - font.widthOfTextAtSize(line, 8)
                : x + 3,
              y: y - j * 11 - 6,
              size: 8,
              font,
            })
          );
          x += widths[i];
        });
        if (style.divider)
          page.drawLine({
            start: { x: 24, y: y + 4 },
            end: { x: 24 + widths.reduce((sum, w) => sum + w, 0), y: y + 4 },
            thickness: 1,
            color: DIVIDER,
          });
        y -= height;
      }
      return height;
    };
    const widths = [30, 132, 38, 30, ...Array(12).fill(38), 104];
    // 背番号 and 氏名 stay left; 登録試合数 through the 12 stats read as numbers.
    const numericColumns = widths.map(
      (_, i) => i >= 2 && i < widths.length - 1
    );
    const header = [
      '背番号',
      '氏名',
      '登録\n試合数',
      '打席',
      ...headings,
      '備考',
    ];
    const start = (continued: boolean) => {
      page = pdf.addPage([841.89, 595.28]);
      y = 565;
      text(
        `${stats.teamName}｜${labels[index]}${continued ? '｜続き' : ''}`,
        12
      );
      text(
        `対象期間: ${describePeriod(options.period)}　実際の対象: ${covered.length ? formatTrendPeriod(covered) : '試合なし'}　発行日時: ${stamp}`
      );
      if (!continued)
        text(
          '保存済みの試合をすべて集計しています。試合終了の確認はしていないため、入力途中の試合を含む場合があります。'
        );
      if (!continued && options.charts === 'none')
        text('グラフは出力していません（表のみ）。');
      text(
        '登録試合数は保存名簿または打席に含まれる試合数です。実際の出場数ではありません。'
      );
      text(
        index === 0
          ? '規定到達: 1打席以上（四死球・犠打・犠飛を含む）'
          : '規定到達: 10打数以上'
      );
      text(
        '並び順: 規定到達 → 規定未到達（打席なし・該当記録なしを含む）。各グループ内は背番号順'
      );
      y -= 4;
      if (!continued) {
        text('チーム成績', 10);
        if (!stats.gameCount) text('試合記録なし');
        else {
          table(
            ['試合数', '勝', '負', '分', '勝率', '得点', '失点'],
            Array(7).fill(100),
            true,
            { header: true, right: Array(7).fill(true) }
          );
          table(
            [
              stats.gameCount,
              stats.wins,
              stats.losses,
              stats.draws,
              stats.wins + stats.losses
                ? (stats.wins / (stats.wins + stats.losses)).toFixed(3)
                : '—',
              stats.totalRuns,
              stats.totalRunsAllowed,
            ].map(String),
            Array(7).fill(100),
            true,
            { right: Array(7).fill(true) }
          );
          y -= 14;
          text('チーム打撃成績', 10);
          table(headings, Array(12).fill(65), true, {
            header: true,
            right: Array(12).fill(true),
          });
          table(values(stats.battingStats), Array(12).fill(65), true, {
            right: Array(12).fill(true),
          });
        }
        y -= 16;
        text('個人成績', 10);
      }
      table(header, widths, true, { header: true, right: numericColumns });
    };
    start(false);
    let qualifiedAbove: boolean | null = null;
    for (let row = 0; row < stats.playerStats.length; row++) {
      const player = stats.playerStats[row];
      checkActive();
      const cells = playerRowCells(types[index], player);
      const height = table(cells, widths, false);
      if (y - height < 35) start(true);
      if (y - height < 35)
        throw new Error(
          '選手の1行がページに収まりません。氏名・IDの長さを確認してください'
        );
      const qualified = meetsQualification(types[index], player);
      table(cells, widths, true, {
        stripe: row % 2 === 1,
        divider: qualifiedAbove === true && !qualified,
        right: numericColumns,
      });
      qualifiedAbove = qualified;
    }
    if (covered.length) {
      const ledgerPage = (continued: boolean) => {
        page = pdf.addPage([841.89, 595.28]);
        y = 565;
        text(
          `${stats.teamName}｜${labels[index]}｜対象試合一覧${continued ? '｜続き' : ''}`,
          12
        );
        text(
          '同日の試合は保存されたIDの順に (1)(2) と並べています。実際の開催順とは限りません。'
        );
        y -= 4;
        table(LEDGER_HEADER, LEDGER_WIDTHS, true, { header: true });
      };
      ledgerPage(false);
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
        if (y - table(cells, LEDGER_WIDTHS, false) < 35) ledgerPage(true);
        table(cells, LEDGER_WIDTHS, true, { stripe: row % 2 === 1 });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (options.charts !== 'none')
      await drawTrendPages(
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
  }
  pdf.getPages().forEach((page, i, pages) =>
    page.drawText(`${i + 1} / ${pages.length}`, {
      x: 780,
      y: 16,
      size: 8,
      font: font as PDFFont,
    })
  );
  checkActive();
  const result = await pdf.save();
  checkActive();
  return result;
}
