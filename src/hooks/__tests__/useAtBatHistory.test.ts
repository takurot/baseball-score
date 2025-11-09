import { renderHook, act } from '@testing-library/react';
import { useAtBatHistory } from '../useAtBatHistory';
import { AtBat } from '../../types';

const initialAtBats: AtBat[] = [
  { id: 'ab1', playerId: 'p1', result: 'IH', inning: 1, isTop: true, rbi: 0, isOut: false },
  { id: 'ab2', playerId: 'p2', result: 'SO', inning: 1, isTop: true, rbi: 0, isOut: true },
];

describe('useAtBatHistory', () => {
  test('should add an at-bat', () => {
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));
    const newAtBat: AtBat = { id: 'ab3', playerId: 'p3', result: 'HR', inning: 2, isTop: true, rbi: 1, isOut: false };

    act(() => {
      result.current.addAtBat(newAtBat);
    });

    expect(result.current.atBats).toHaveLength(3);
    expect(result.current.atBats[2]).toEqual(newAtBat);
  });

  test('should update an at-bat', () => {
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));
    const updatedAb: AtBat = { ...initialAtBats[0], result: '2B' };

    act(() => {
      result.current.updateAtBat(updatedAb);
    });

    expect(result.current.atBats[0].result).toBe('2B');
  });

  test('should delete an at-bat', () => {
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));

    act(() => {
      result.current.deleteAtBat('ab1');
    });

    expect(result.current.atBats).toHaveLength(1);
    expect(result.current.atBats.find(ab => ab.id === 'ab1')).toBeUndefined();
  });

  test('should set at-bats directly', () => {
    const { result } = renderHook(() => useAtBatHistory([]));
    
    act(() => {
      result.current.setAtBats(initialAtBats);
    });

    expect(result.current.atBats).toHaveLength(2);
  });
});

