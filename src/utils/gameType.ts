import { GameType } from '../types';

export type GameTypeFilter = 'all' | GameType;

export const GAME_TYPE_PARAM = 'gameType';

export const parseGameTypeFilter = (value: string | null): GameTypeFilter => {
  if (value === 'official' || value === 'practice') {
    return value;
  }
  return 'all';
};

export type GameTypeSource = {
  gameType?: GameType;
  tournament?: string;
};

/**
 * 試合データの試合区分を取得する。
 * 過去データで gameType が未設定の場合は、tournament（大会名）の有無から推測する（フォールバック）。
 * - tournament に有効な文字列があれば 'official'
 * - それ以外は 'practice'
 */
export const getEffectiveGameType = (game?: GameTypeSource): GameType => {
  if (!game) {
    return 'practice';
  }
  if (game.gameType) {
    return game.gameType;
  }
  if (game.tournament && game.tournament.trim().length > 0) {
    return 'official';
  }
  return 'practice';
};

/**
 * 試合区分の日本語表示ラベルを取得する。
 */
export const getGameTypeLabel = (gameType: GameType): string => {
  return gameType === 'official' ? '公式戦' : '練習試合';
};

/**
 * 試合が指定のフィルター条件（すべて / 公式戦 / 練習試合）に合致するか判定する。
 */
export const matchesGameTypeFilter = (
  game: GameTypeSource,
  filter: GameTypeFilter
): boolean => {
  if (filter === 'all') {
    return true;
  }
  return getEffectiveGameType(game) === filter;
};
