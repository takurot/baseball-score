import type { Game, GameType } from '../types';
import { isCalendarDate } from './BattingStatsTrend';

// Inclusive date bounds (YYYY-MM-DD); an omitted bound is open.
export interface ReportPeriod {
  start?: string;
  end?: string;
}

// all: team and every player / team: team only / none: tables only.
export type ChartScope = 'all' | 'team' | 'none';

export interface TeamStatsPdfOptions {
  types: readonly GameType[];
  period: ReportPeriod;
  charts: ChartScope;
  // With charts 'all', skip the figure frames of players without a plate appearance.
  omitEmptyCharts: boolean;
}

// The full report: every type, every game, the team and every player.
export const DETAILED_PDF_OPTIONS: TeamStatsPdfOptions = {
  types: ['official', 'practice', 'junior'],
  period: {},
  charts: 'all',
  omitEmptyCharts: false,
};

const KNOWN_TYPES: readonly GameType[] = ['official', 'practice', 'junior'];

export const validatePdfOptions = (options: TeamStatsPdfOptions): void => {
  const { types, period } = options;
  if (
    !types.length ||
    new Set(types).size !== types.length ||
    types.some((type) => !KNOWN_TYPES.includes(type))
  )
    throw new Error('出力する区分を1つ以上、重複なく選んでください');
  if (period.start !== undefined && !isCalendarDate(period.start))
    throw new Error('開始日が正しい日付ではありません');
  if (period.end !== undefined && !isCalendarDate(period.end))
    throw new Error('終了日が正しい日付ではありません');
  if (period.start && period.end && period.start > period.end)
    throw new Error('開始日は終了日以前の日付にしてください');
};

export const describePeriod = ({ start, end }: ReportPeriod): string =>
  start && end
    ? `${start}〜${end}`
    : start
      ? `${start}以降`
      : end
        ? `${end}以前`
        : '全期間';

// The tables and the charts are both built from this one result.
export const filterGamesByPeriod = (
  games: readonly Game[],
  { start, end }: ReportPeriod
): readonly Game[] =>
  !start && !end
    ? games
    : games.filter((game) => {
        if (!isCalendarDate(game.date))
          throw new Error(
            `試合日付が不正なため期間を判定できません（試合ID: ${game.id}、日付: ${game.date || '未設定'}）`
          );
        return (!start || game.date >= start) && (!end || game.date <= end);
      });
