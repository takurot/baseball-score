import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

describe('useUndoRedo', () => {
  it('should initialize with the given state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should track state changes with set', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });

    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future on new change after undo', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });

    act(() => {
      result.current.set({ count: 2 });
    });

    act(() => {
      result.current.undo();
    });

    // Now at count: 1, future has count: 2
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.set({ count: 3 });
    });

    // Future should be cleared
    expect(result.current.state).toEqual({ count: 3 });
    expect(result.current.canRedo).toBe(false);
  });

  it('should handle multiple undo operations', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });
    act(() => {
      result.current.set({ count: 2 });
    });
    act(() => {
      result.current.set({ count: 3 });
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 2 });

    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 1 });

    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
  });

  it('should handle multiple redo operations', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
    });
    act(() => {
      result.current.set({ count: 2 });
    });
    act(() => {
      result.current.set({ count: 3 });
    });

    // Undo all
    act(() => {
      result.current.undo();
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.state).toEqual({ count: 0 });

    // Redo all
    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 1 });

    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 2 });

    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 3 });
    expect(result.current.canRedo).toBe(false);
  });

  it('should not change state when undo is called with empty past', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
  });

  it('should not change state when redo is called with empty future', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canRedo).toBe(false);
  });

  it('should work with complex objects', () => {
    const initialState = {
      game: { inning: 1, isTop: true },
      teams: [{ name: 'TeamA', score: 0 }],
    };

    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.set({
        game: { inning: 1, isTop: false },
        teams: [{ name: 'TeamA', score: 1 }],
      });
    });

    expect(result.current.state.teams[0].score).toBe(1);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state.teams[0].score).toBe(0);
  });

  it('should provide reset function to clear history', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
      result.current.set({ count: 2 });
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.reset({ count: 5 });
    });

    expect(result.current.state).toEqual({ count: 5 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
