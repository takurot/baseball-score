import { renderHook, act } from '@testing-library/react';
import { useAtBatHistory } from '../useAtBatHistory';
import { AtBat } from '../../types';

const initialAtBats: AtBat[] = [
  {
    id: 'ab1',
    playerId: 'p1',
    result: 'IH',
    inning: 1,
    isTop: true,
    rbi: 0,
    isOut: false,
  },
  {
    id: 'ab2',
    playerId: 'p2',
    result: 'SO',
    inning: 1,
    isTop: true,
    rbi: 0,
    isOut: true,
  },
];

describe('useAtBatHistory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add an at-bat', () => {
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));
    const newAtBat: AtBat = {
      id: 'ab3',
      playerId: 'p3',
      result: 'HR',
      inning: 2,
      isTop: true,
      rbi: 1,
      isOut: false,
    };

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
    expect(result.current.atBats.find((ab) => ab.id === 'ab1')).toBeUndefined();
  });

  test('should reset at-bats loaded asynchronously', () => {
    const { result } = renderHook(() => useAtBatHistory([]));

    act(() => {
      result.current.resetAtBats(initialAtBats);
    });

    expect(result.current.atBats).toHaveLength(2);
  });

  test('should reject a duplicate id when adding an at-bat', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));

    act(() => {
      result.current.addAtBat({ ...initialAtBats[0], result: 'HR' });
    });

    expect(result.current.atBats).toEqual(initialAtBats);
    expect(warn).toHaveBeenCalledWith('Duplicate at-bat id ignored: ab1');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('should remove duplicate ids from initial history', () => {
    const { result } = renderHook(() =>
      useAtBatHistory([initialAtBats[0], { ...initialAtBats[0], result: 'HR' }])
    );

    expect(result.current.atBats).toEqual([initialAtBats[0]]);
  });

  test('should remove duplicate ids when resetting at-bats', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAtBatHistory([]));

    act(() => {
      result.current.resetAtBats([
        initialAtBats[0],
        { ...initialAtBats[0], result: 'HR' },
      ]);
    });

    expect(result.current.atBats).toEqual([initialAtBats[0]]);
  });

  test('should warn and preserve history when updating a missing id', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));

    act(() => {
      result.current.updateAtBat({ ...initialAtBats[0], id: 'missing' });
    });

    expect(result.current.atBats).toEqual(initialAtBats);
    expect(warn).toHaveBeenCalledWith(
      'At-bat id not found for update: missing'
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('should warn and preserve history when deleting a missing id', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useAtBatHistory(initialAtBats));

    act(() => {
      result.current.deleteAtBat('missing');
    });

    expect(result.current.atBats).toEqual(initialAtBats);
    expect(warn).toHaveBeenCalledWith(
      'At-bat id not found for deletion: missing'
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('should apply an update after an add in the same batch', () => {
    const { result } = renderHook(() => useAtBatHistory([]));
    const newAtBat = { ...initialAtBats[0], id: 'batched' };

    act(() => {
      result.current.addAtBat(newAtBat);
      result.current.updateAtBat({ ...newAtBat, result: '2B' });
    });

    expect(result.current.atBats).toEqual([{ ...newAtBat, result: '2B' }]);
  });

  test('should apply a delete after an add in the same batch', () => {
    const { result } = renderHook(() => useAtBatHistory([]));
    const newAtBat = { ...initialAtBats[0], id: 'batched' };

    act(() => {
      result.current.addAtBat(newAtBat);
      result.current.deleteAtBat(newAtBat.id);
    });

    expect(result.current.atBats).toEqual([]);
  });
});
