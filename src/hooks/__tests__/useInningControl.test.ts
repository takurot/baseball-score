import { renderHook } from '@testing-library/react';
import { useInningControl } from '../useInningControl';

describe('useInningControl', () => {
  const { result } = renderHook(() => useInningControl());
  const { getNextGameState, isGameEnd } = result.current;

  describe('getNextGameState', () => {
    test('should increment outs if isOut is true', () => {
      const newState = getNextGameState(0, true, 1, true);
      expect(newState.outs).toBe(1);
    });

    test('should change inning if 3 outs', () => {
      const newState = getNextGameState(2, true, 1, true);
      expect(newState.outs).toBe(0);
      expect(newState.inning).toBe(1);
      expect(newState.isTop).toBe(false);
    });

    test('should increment inning after bottom of the inning', () => {
      const newState = getNextGameState(2, true, 1, false);
      expect(newState.outs).toBe(0);
      expect(newState.inning).toBe(2);
      expect(newState.isTop).toBe(true);
    });
  });

  describe('isGameEnd', () => {
    test('should return false if game is not over', () => {
      expect(isGameEnd(6, false)).toBe(false);
    });

    test('should return true if game is over (7th inning bottom)', () => {
      expect(isGameEnd(7, false)).toBe(true);
    });

    test('should return true if game is over (8th inning top)', () => {
      expect(isGameEnd(8, true)).toBe(true);
    });
  });
});
