import type { Game } from '../types';
import {
  DETAILED_PDF_OPTIONS,
  describePeriod,
  filterGamesByPeriod,
  validatePdfOptions,
} from './TeamStatsPdfOptions';

const game = (id: string, date: string): Game =>
  ({
    id,
    date,
    gameType: 'official',
    homeTeam: { id: 't', name: 'T', players: [], atBats: [] },
    awayTeam: { id: 'o', name: 'O', players: [], atBats: [] },
    currentInning: 1,
  }) as Game;

const games = [
  game('a', '2026-03-31'),
  game('b', '2026-04-01'),
  game('c', '2026-04-30'),
  game('d', '2026-05-01'),
];
const ids = (list: readonly Game[]) => list.map((g) => g.id);

describe('filterGamesByPeriod', () => {
  test('keeps every game for the whole period, even one with an unusable date', () => {
    const broken = [...games, game('x', '')];
    expect(filterGamesByPeriod(broken, {})).toBe(broken);
  });

  test('includes both boundary dates and excludes the days just outside', () => {
    expect(
      ids(
        filterGamesByPeriod(games, { start: '2026-04-01', end: '2026-04-30' })
      )
    ).toEqual(['b', 'c']);
  });

  test('accepts an open start or an open end', () => {
    expect(ids(filterGamesByPeriod(games, { start: '2026-04-30' }))).toEqual([
      'c',
      'd',
    ]);
    expect(ids(filterGamesByPeriod(games, { end: '2026-04-01' }))).toEqual([
      'a',
      'b',
    ]);
  });

  test('returns no games when none falls inside the period', () => {
    expect(
      filterGamesByPeriod(games, { start: '2027-01-01', end: '2027-12-31' })
    ).toEqual([]);
  });

  test('refuses a game whose date cannot be placed in a chosen period', () => {
    expect(() =>
      filterGamesByPeriod([game('broken', '')], { start: '2026-04-01' })
    ).toThrow(/試合日付.*broken/);
  });
});

describe('validatePdfOptions', () => {
  test('accepts the detailed defaults', () => {
    expect(() => validatePdfOptions(DETAILED_PDF_OPTIONS)).not.toThrow();
  });

  test.each([
    [{ ...DETAILED_PDF_OPTIONS, types: [] }, '区分'],
    [{ ...DETAILED_PDF_OPTIONS, types: ['official', 'official'] }, '区分'],
    [{ ...DETAILED_PDF_OPTIONS, period: { start: '2026-02-30' } }, '開始日'],
    [{ ...DETAILED_PDF_OPTIONS, period: { end: 'soon' } }, '終了日'],
    [
      {
        ...DETAILED_PDF_OPTIONS,
        period: { start: '2026-05-01', end: '2026-04-01' },
      },
      '開始日',
    ],
  ])('rejects %j', (options, message) => {
    expect(() => validatePdfOptions(options as never)).toThrow(message);
  });
});

test('describes the period the way the PDF prints it', () => {
  expect(describePeriod({})).toBe('全期間');
  expect(describePeriod({ start: '2026-04-01', end: '2026-04-30' })).toBe(
    '2026-04-01〜2026-04-30'
  );
  expect(describePeriod({ start: '2026-04-01' })).toBe('2026-04-01以降');
  expect(describePeriod({ end: '2026-04-30' })).toBe('2026-04-30以前');
});
