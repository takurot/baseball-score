import { TrendGame, TrendMetric, TrendPoint } from '../types';

// Shared by the on-screen SVG and the PDF so both draw identical charts.
export interface TrendSeries {
  metric: TrendMetric;
  label: string;
  color: string;
  dash: readonly number[];
  // SVG path data centered on the data point, with y growing downward.
  marker: string;
}

// Colors validated as a set for color-vision deficiency and 3:1 contrast on white;
// dash and marker shape keep the series apart without relying on color.
// Renderers draw in this order so a dashed line stays visible over an equal solid one.
export const TREND_SERIES: readonly TrendSeries[] = [
  {
    metric: 'battingAvg',
    label: '打率',
    color: '#2a78d6',
    dash: [],
    marker: 'M -4.5 0 A 4.5 4.5 0 1 0 4.5 0 A 4.5 4.5 0 1 0 -4.5 0 Z',
  },
  {
    metric: 'obp',
    label: '出塁率',
    color: '#d95926',
    dash: [6, 4],
    marker: 'M -3.25 -3.25 L 3.25 -3.25 L 3.25 3.25 L -3.25 3.25 Z',
  },
  {
    metric: 'slg',
    label: '長打率',
    color: '#199e70',
    dash: [2, 2],
    marker: 'M 0 -4.5 L 4.5 3.5 L -4.5 3.5 Z',
  },
  {
    metric: 'ops',
    label: 'OPS',
    color: '#4a3aa7',
    dash: [8, 3, 2, 3],
    marker: 'M 0 -5 L 5 0 L 0 5 L -5 0 Z',
  },
];

export interface TrendScale {
  max: number;
  ticks: number[];
}

const TICK_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10];
const MAX_TICK_INTERVALS = 5;
const MIN_MARKER_SPACING = 12;

const round = (value: number, digits: number): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

export const buildTrendScale = (points: readonly TrendPoint[]): TrendScale => {
  const largest = Math.max(
    0,
    ...points.flatMap((point) =>
      point.rates ? TREND_SERIES.map((s) => point.rates![s.metric]) : []
    )
  );
  const intervalsFor = (step: number) =>
    Math.max(1, Math.ceil(largest / step - 1e-9));
  const step =
    TICK_STEPS.find(
      (candidate) => intervalsFor(candidate) <= MAX_TICK_INTERVALS
    ) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const ticks = Array.from({ length: intervalsFor(step) + 1 }, (_, i) =>
    round(i * step, 3)
  );
  return { max: ticks[ticks.length - 1], ticks };
};

export const formatRate = (value: number): string =>
  value.toFixed(3).replace(/^0+/, '');

export const xPosition = (index: number, count: number, width: number) =>
  round(((index + 0.5) * width) / count, 2);

export interface PlotPoint {
  index: number;
  x: number;
  y: number;
}

// Coordinates inside a width x height plot whose origin is the top-left corner.
export const projectSeries = (
  points: readonly TrendPoint[],
  metric: TrendMetric,
  scale: TrendScale,
  width: number,
  height: number
): PlotPoint[] =>
  points.flatMap((point, index) =>
    point.rates
      ? [
          {
            index,
            x: xPosition(index, points.length, width),
            y: round((1 - point.rates[metric] / scale.max) * height, 2),
          },
        ]
      : []
  );

export const toPathData = (plotted: readonly PlotPoint[]): string =>
  plotted.length < 2
    ? ''
    : plotted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

export const showMarkers = (
  gameCount: number,
  plottedCount: number,
  width: number
): boolean => plottedCount === 1 || width / gameCount >= MIN_MARKER_SPACING;

export const axisLabelIndices = (
  count: number,
  maxLabels: number
): number[] => {
  const step = Math.max(1, Math.ceil(count / Math.max(1, maxLabels)));
  return Array.from({ length: count }, (_, i) => i).filter(
    (i) => i % step === 0
  );
};

export const axisLabel = (game: TrendGame): string => {
  const [, month, day] = game.date.split('-');
  return `${Number(month)}/${Number(day)}${game.label.slice(game.date.length)}`;
};

export const formatTrendPeriod = (points: readonly TrendPoint[]): string => {
  if (!points.length) return '試合なし';
  const first = points[0].game.date;
  const last = points[points.length - 1].game.date;
  const range = first === last ? first : `${first}〜${last}`;
  return `${range}（${points.length}試合）`;
};
