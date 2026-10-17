import {
  getEffectiveGameType,
  getGameTypeLabel,
  matchesGameTypeFilter,
} from '../gameType';
import { Game } from '../../types';

describe('gameType utils', () => {
  describe('getEffectiveGameType', () => {
    it('returns explicitly set gameType when present', () => {
      expect(
        getEffectiveGameType({ gameType: 'official', tournament: '' })
      ).toBe('official');
      expect(
        getEffectiveGameType({
          gameType: 'practice',
          tournament: '某トーナメント',
        })
      ).toBe('practice');
    });

    it('falls back to "official" when gameType is undefined but tournament has content', () => {
      expect(getEffectiveGameType({ tournament: '秋季市民大会' })).toBe(
        'official'
      );
      expect(
        getEffectiveGameType({
          gameType: undefined,
          tournament: '秋季市民大会',
        })
      ).toBe('official');
    });

    it('falls back to "practice" when gameType is undefined and tournament is empty or whitespace', () => {
      expect(getEffectiveGameType({})).toBe('practice');
      expect(getEffectiveGameType({ tournament: '' })).toBe('practice');
      expect(getEffectiveGameType({ tournament: '   ' })).toBe('practice');
    });
  });

  describe('getGameTypeLabel', () => {
    it('returns correct Japanese labels', () => {
      expect(getGameTypeLabel('official')).toBe('公式戦');
      expect(getGameTypeLabel('practice')).toBe('練習試合');
    });
  });

  describe('matchesGameTypeFilter', () => {
    const officialGame: Partial<Game> = { gameType: 'official' };
    const practiceGame: Partial<Game> = { gameType: 'practice' };
    const legacyOfficial: Partial<Game> = { tournament: '選手権' };
    const legacyPractice: Partial<Game> = { tournament: '' };

    it('returns true for any game when filter is "all"', () => {
      expect(matchesGameTypeFilter(officialGame, 'all')).toBe(true);
      expect(matchesGameTypeFilter(practiceGame, 'all')).toBe(true);
      expect(matchesGameTypeFilter(legacyOfficial, 'all')).toBe(true);
      expect(matchesGameTypeFilter(legacyPractice, 'all')).toBe(true);
    });

    it('matches official games correctly with "official" filter', () => {
      expect(matchesGameTypeFilter(officialGame, 'official')).toBe(true);
      expect(matchesGameTypeFilter(practiceGame, 'official')).toBe(false);
      expect(matchesGameTypeFilter(legacyOfficial, 'official')).toBe(true);
      expect(matchesGameTypeFilter(legacyPractice, 'official')).toBe(false);
    });

    it('matches practice games correctly with "practice" filter', () => {
      expect(matchesGameTypeFilter(officialGame, 'practice')).toBe(false);
      expect(matchesGameTypeFilter(practiceGame, 'practice')).toBe(true);
      expect(matchesGameTypeFilter(legacyOfficial, 'practice')).toBe(false);
      expect(matchesGameTypeFilter(legacyPractice, 'practice')).toBe(true);
    });
  });
});
