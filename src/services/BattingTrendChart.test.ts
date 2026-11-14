import { TrendPoint, TrendRates } from '../types';
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
} from './BattingTrendChart';

const point = (
  id: string,
  date: string,
  rates: TrendRates | null,
  label = date
): TrendPoint => ({
  game: { id, date, label, opponentName: '相手' },
  rates,
});

const r = (battingAvg: number, obp: number, slg: number): TrendRates => ({
  battingAvg,
  obp,
  slg,
  ops: obp + slg,
});

test('defines four overlaid series distinguished by color, dash, and marker', () => {
  expect(TREND_SERIES.map((s) => [s.metric, s.label])).toEqual([
    ['battingAvg', '打率'],
    ['obp', '出塁率'],
    ['slg', '長打率'],
    ['ops', 'OPS'],
  ]);
  for (const key of ['color', 'marker'] as const) {
    expect(new Set(TREND_SERIES.map((s) => s[key])).size).toBe(4);
  }
  expect(new Set(TREND_SERIES.map((s) => s.dash.join(' '))).size).toBe(4);
});

test.each([
  [r(0.25, 0.3, 0.4), 0.7, [0, 0.2, 0.4, 0.6, 0.8]],
  [r(0.3, 0.4, 0.5), 0.9, [0, 0.2, 0.4, 0.6, 0.8, 1]],
  [r(0.5, 0.6, 0.634), 1.234, [0, 0.25, 0.5, 0.75, 1, 1.25]],
  [r(1, 1, 4), 5, [0, 1, 2, 3, 4, 5]],
  [r(0, 0, 0), 0, [0, 0.1]],
  [r(0.1, 0.1, 0.1), 0.2, [0, 0.1, 0.2]],
])(
  'uses one zero-based axis that covers every series (%#)',
  (rates, max, ticks) => {
    expect(rates.ops).toBeCloseTo(max);
    const scale = buildTrendScale([
      point('a', '2026-04-01', null),
      point('b', '2026-04-02', rates),
    ]);
    expect(scale.ticks).toEqual(ticks);
    expect(scale.max).toBe(ticks[ticks.length - 1]);
    expect(scale.max).toBeGreaterThanOrEqual(max);
  }
);

test('formats rates to three decimals without clipping values above one', () => {
  expect([0, 0.2, 1 / 3, 1, 5].map(formatRate)).toEqual([
    '.000',
    '.200',
    '.333',
    '1.000',
    '5.000',
  ]);
});

test('projects equally spaced games and skips missing points', () => {
  const points = [
    point('a', '2026-04-01', null),
    point('b', '2026-04-02', r(0.5, 0.5, 0.5)),
    point('c', '2026-04-03', r(0.25, 0.5, 1)),
  ];
  const scale = buildTrendScale(points);
  expect(scale.max).toBe(1.5);
  const plotted = projectSeries(points, 'slg', scale, 300, 150);
  expect(plotted).toEqual([
    { index: 1, x: 150, y: 100 },
    { index: 2, x: 250, y: 50 },
  ]);
  expect(toPathData(plotted)).toBe('M 150 100 L 250 50');
});

test('draws a single point without inventing a line', () => {
  const points = [point('a', '2026-04-01', r(0.5, 0.5, 0.5))];
  const plotted = projectSeries(
    points,
    'ops',
    buildTrendScale(points),
    200,
    100
  );
  expect(plotted).toEqual([{ index: 0, x: 100, y: 0 }]);
  expect(toPathData(plotted)).toBe('');
  expect(showMarkers(plotted.length, 1, 200)).toBe(true);
});

test('hides crowded markers but never for a lone point', () => {
  expect(showMarkers(20, 20, 400)).toBe(true);
  expect(showMarkers(80, 80, 400)).toBe(false);
  expect(showMarkers(80, 1, 400)).toBe(true);
});

test('thins axis labels without dropping points', () => {
  expect(axisLabelIndices(5, 10)).toEqual([0, 1, 2, 3, 4]);
  expect(axisLabelIndices(10, 4)).toEqual([0, 3, 6, 9]);
  expect(axisLabelIndices(0, 4)).toEqual([]);
  expect(axisLabelIndices(3, 0)).toEqual([0]);
});

test('shortens axis labels while keeping the same-day number', () => {
  expect(axisLabel(point('a', '2026-05-02', null).game)).toBe('5/2');
  expect(axisLabel(point('a', '2026-11-11', null, '2026-11-11 (2)').game)).toBe(
    '11/11 (2)'
  );
});

test('describes the covered period and game count', () => {
  expect(formatTrendPeriod([])).toBe('試合なし');
  expect(formatTrendPeriod([point('a', '2026-04-01', null)])).toBe(
    '2026-04-01（1試合）'
  );
  expect(
    formatTrendPeriod([
      point('a', '2026-04-01', null),
      point('b', '2026-04-01', null),
      point('c', '2026-06-30', null),
    ])
  ).toBe('2026-04-01〜2026-06-30（3試合）');
});
