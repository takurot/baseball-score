import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import type { TeamStats } from '../firebase/statsService';
import { Game, GameType, TrendPoint } from '../types';
import { buildBattingTrend } from './BattingStatsTrend';
import {
  TREND_SERIES,
  axisLabel,
  axisLabelIndices,
  buildTrendScale,
  formatRate,
  formatTrendPeriod,
  projectSeries,
  showMarkers,
  toPathData,
  xPosition,
} from './BattingTrendChart';

export interface TrendPdfContext {
  pdf: PDFDocument;
  font: PDFFont;
  wrap: (text: string, width: number, size?: number) => string[];
  checkActive: () => void;
}

interface Figure {
  caption: string;
  points: TrendPoint[];
}

const PAGE: [number, number] = [841.89, 595.28];
const LEFT = 24;
const WIDTH = PAGE[0] - LEFT * 2;
const TOP = 565;
const BOTTOM = 35;
const FIGURE_GAP = 8;
const PAD = 6;
const CAPTION_LINE = 14;
const LEGEND_ROW = 14;
const TICK_LABEL_WIDTH = 30;
const X_LABEL_ROW = 16;
const MIN_PLOT_HEIGHT = 100;
const MESSAGE_HEIGHT = 40;
const AXIS_LABEL_SLOT = 48;
const INK = rgb(0.2, 0.2, 0.2);
const GRID = rgb(0.85, 0.85, 0.85);
const AXIS = rgb(0.6, 0.6, 0.6);
const WHITE = rgb(1, 1, 1);

const toColor = (hex: string) =>
  rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

const playerCaption = (player: TeamStats['playerStats'][number]) =>
  player.playerNumber
    ? `背番号${player.playerNumber} ${player.playerName}`
    : player.playerName;

function drawFigure(
  font: PDFFont,
  page: PDFPage,
  figure: Figure,
  captionLines: string[],
  top: number,
  height: number
) {
  const text = (value: string, x: number, y: number, size = 8) =>
    page.drawText(value, { x, y, size, font, color: INK });

  page.drawRectangle({
    x: LEFT,
    y: top - height,
    width: WIDTH,
    height,
    borderWidth: 0.5,
    borderColor: AXIS,
  });
  let y = top - PAD - 10;
  for (const line of captionLines) {
    text(line, LEFT + PAD, y, 10);
    y -= CAPTION_LINE;
  }

  if (!figure.points.some((point) => point.rates)) {
    const message = figure.points.length ? '打席記録なし' : '試合記録なし';
    text(
      message,
      LEFT + WIDTH / 2 - font.widthOfTextAtSize(message, 10) / 2,
      top - height / 2,
      10
    );
    return;
  }

  let legendX = LEFT + PAD;
  const legendY = y + 3;
  for (const series of TREND_SERIES) {
    const color = toColor(series.color);
    page.drawLine({
      start: { x: legendX, y: legendY },
      end: { x: legendX + 22, y: legendY },
      thickness: 1.5,
      color,
      dashArray: series.dash.length ? [...series.dash] : undefined,
    });
    page.drawSvgPath(series.marker, {
      x: legendX + 11,
      y: legendY,
      color,
      borderColor: WHITE,
      borderWidth: 0.5,
      scale: 0.75,
    });
    text(series.label, legendX + 26, legendY - 3);
    legendX += 26 + font.widthOfTextAtSize(series.label, 8) + 16;
  }

  const plotLeft = LEFT + PAD + TICK_LABEL_WIDTH;
  const plotWidth = WIDTH - PAD * 2 - TICK_LABEL_WIDTH - 4;
  const plotTop = y - LEGEND_ROW + 6;
  const plotBottom = top - height + PAD + X_LABEL_ROW;
  const plotHeight = plotTop - plotBottom;
  const scale = buildTrendScale(figure.points);

  for (const tick of scale.ticks) {
    const tickY = plotBottom + (tick / scale.max) * plotHeight;
    page.drawLine({
      start: { x: plotLeft, y: tickY },
      end: { x: plotLeft + plotWidth, y: tickY },
      thickness: 0.3,
      color: GRID,
    });
    const label = formatRate(tick);
    text(label, plotLeft - 4 - font.widthOfTextAtSize(label, 8), tickY - 3);
  }
  page.drawLine({
    start: { x: plotLeft, y: plotBottom },
    end: { x: plotLeft, y: plotTop },
    thickness: 0.5,
    color: AXIS,
  });
  page.drawLine({
    start: { x: plotLeft, y: plotBottom },
    end: { x: plotLeft + plotWidth, y: plotBottom },
    thickness: 0.5,
    color: AXIS,
  });
  const count = figure.points.length;
  for (const index of axisLabelIndices(
    count,
    Math.floor(plotWidth / AXIS_LABEL_SLOT)
  )) {
    const label = axisLabel(figure.points[index].game);
    const x = plotLeft + xPosition(index, count, plotWidth);
    text(label, x - font.widthOfTextAtSize(label, 8) / 2, plotBottom - 11);
  }

  for (const series of TREND_SERIES) {
    const color = toColor(series.color);
    const plotted = projectSeries(
      figure.points,
      series.metric,
      scale,
      plotWidth,
      plotHeight
    );
    const path = toPathData(plotted);
    if (path) {
      page.drawSvgPath(path, {
        x: plotLeft,
        y: plotTop,
        borderColor: color,
        borderWidth: 1.5,
        borderDashArray: series.dash.length ? [...series.dash] : undefined,
      });
    }
    if (!showMarkers(count, plotted.length, plotWidth)) continue;
    for (const point of plotted) {
      page.drawSvgPath(series.marker, {
        x: plotLeft + point.x,
        y: plotTop - point.y,
        color,
        borderColor: WHITE,
        borderWidth: 0.5,
        scale: 0.75,
      });
    }
  }
}

// Chart pages for one game type: the team first, then each player in table order.
export async function drawTrendPages(
  ctx: TrendPdfContext,
  stats: TeamStats,
  games: readonly Game[],
  gameType: GameType,
  label: string
): Promise<void> {
  const { pdf, font, wrap, checkActive } = ctx;
  const figure = (subject: string, points: TrendPoint[]): Figure => ({
    caption: `${subject}｜${label}｜対象期間: ${formatTrendPeriod(points)}`,
    points,
  });
  const figures = [
    figure(
      `チーム: ${stats.teamName}`,
      buildBattingTrend(games, gameType, { teamId: stats.teamId })
    ),
    ...stats.playerStats.map((player) =>
      figure(
        playerCaption(player),
        buildBattingTrend(games, gameType, {
          teamId: stats.teamId,
          playerId: player.playerId,
        })
      )
    ),
  ];

  const header: [string, number][] = [
    [`${stats.teamName}｜${label}｜打撃成績の推移`, 12],
    [
      '打率・出塁率・長打率・OPSは、各試合までの打席を合計して計算した累積値です。縦軸は4指標共通で0から始まります。',
      8,
    ],
    [
      '横軸は試合順（試合日）です。同日の試合は保存されたIDの順に並べており、実際の開催順とは限りません。試合が多い場合は日付ラベルを間引きます。',
      8,
    ],
  ];
  const headerLines = header.flatMap(([value, size]) =>
    wrap(value, WIDTH, size).map((line): [string, number] => [line, size])
  );
  const headerHeight = headerLines.reduce((sum, [, size]) => sum + size + 4, 0);
  const fullHeight = TOP - headerHeight - 4 - BOTTOM;
  const halfHeight = (fullHeight - FIGURE_GAP) / 2;

  let page: PDFPage | null = null;
  let freeSlots = 0;
  const startPage = async () => {
    if (page) {
      checkActive();
      await yieldToBrowser();
      checkActive();
    }
    page = pdf.addPage(PAGE);
    let y = TOP;
    for (const [line, size] of headerLines) {
      page.drawText(line, { x: LEFT, y, size, font, color: INK });
      y -= size + 4;
    }
    freeSlots = 2;
    return page;
  };

  for (const item of figures) {
    checkActive();
    const captionLines = wrap(item.caption, WIDTH - PAD * 2, 10);
    const needed =
      PAD * 2 +
      captionLines.length * CAPTION_LINE +
      (item.points.some((point) => point.rates)
        ? LEGEND_ROW + MIN_PLOT_HEIGHT + X_LABEL_ROW
        : MESSAGE_HEIGHT);
    if (needed > fullHeight) {
      throw new Error(
        'グラフの見出しがページに収まりません。チーム名・選手名の長さを確認してください'
      );
    }
    const top = TOP - headerHeight - 4;
    if (needed > halfHeight) {
      drawFigure(font, await startPage(), item, captionLines, top, fullHeight);
      freeSlots = 0;
      continue;
    }
    const target: PDFPage = freeSlots ? page! : await startPage();
    const slot = 2 - freeSlots;
    drawFigure(
      font,
      target,
      item,
      captionLines,
      top - slot * (halfHeight + FIGURE_GAP),
      halfHeight
    );
    freeSlots--;
  }
  checkActive();
  await yieldToBrowser();
}
