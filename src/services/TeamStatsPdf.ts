import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { TeamStats } from '../firebase/statsService';
import { meetsQualification } from '../utils/gameType';

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
const rate = (n: number) => n.toFixed(3).replace(/^0+/, '');
const values = (s: TeamStats['battingStats']) =>
  keys.map((key, i) => (i >= 8 ? rate(s[key]) : String(s[key])));

export async function createTeamStatsPdf(
  sections: TeamStats[],
  fontBytes: ArrayBuffer,
  issuedAt: Date,
  checkActive: () => void
): Promise<Uint8Array> {
  if (sections.length !== 3) throw new Error('3区分の成績が必要です');
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
  const stamp = `${issuedAt.toISOString()} (UTC)`;
  for (let index = 0; index < sections.length; index++) {
    const stats = sections[index];
    checkActive();
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
    const table = (cells: string[], widths: number[], draw = true) => {
      const lines = cells.map((cell, i) => wrap(cell, widths[i] - 6));
      const height = Math.max(...lines.map((l) => l.length)) * 11 + 8;
      if (draw) {
        if (y - height < 35)
          throw new Error(
            '表がページに収まりません。チーム名や項目の長さを確認してください'
          );
        let x = 24;
        lines.forEach((cell, i) => {
          page.drawRectangle({
            x,
            y: y - height + 4,
            width: widths[i],
            height,
            borderWidth: 0.3,
            borderColor: rgb(0.6, 0.6, 0.6),
          });
          cell.forEach((line, j) =>
            page.drawText(line, { x: x + 3, y: y - j * 11 - 6, size: 8, font })
          );
          x += widths[i];
        });
        y -= height;
      }
      return height;
    };
    const widths = [30, 132, 38, 30, ...Array(12).fill(38), 104];
    const header = [
      '背番号',
      '氏名',
      '登録試合数',
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
      text(`対象期間: 全期間　発行日時: ${stamp}`);
      text(
        '登録試合数は保存名簿または打席に含まれる試合数です。実際の出場数ではありません。'
      );
      text(
        index === 0
          ? '規定到達: 1打席以上（四死球・犠打・犠飛を含む）'
          : '規定到達: 10打数以上'
      );
      if (!continued) {
        text('チーム成績', 10);
        if (!stats.gameCount) text('試合記録なし');
        else {
          table(
            ['試合数', '勝', '負', '分', '勝率', '得点', '失点'],
            Array(7).fill(100)
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
            Array(7).fill(100)
          );
          y -= 14;
          text('チーム打撃成績', 10);
          table(headings, Array(12).fill(65));
          table(values(stats.battingStats), Array(12).fill(65));
        }
        y -= 16;
        text('個人成績', 10);
      }
      table(header, widths);
    };
    start(false);
    for (const player of stats.playerStats) {
      checkActive();
      const cells = [
        player.playerNumber,
        player.playerName,
        String(player.gameCount),
        player.gameCount ? String(player.plateAppearances) : '—',
        ...(player.gameCount ? values(player) : Array(12).fill('—')),
        !player.gameCount
          ? '該当記録なし'
          : meetsQualification(types[index], player)
            ? '規定到達'
            : player.plateAppearances
              ? '規定未到達'
              : '控え・打席なし',
      ];
      const height = table(cells, widths, false);
      if (y - height < 35) start(true);
      if (y - height < 35)
        throw new Error(
          '選手の1行がページに収まりません。氏名・IDの長さを確認してください'
        );
      table(cells, widths);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
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
