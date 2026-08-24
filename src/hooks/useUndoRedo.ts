import { useState, useCallback } from 'react';

/**
 * Interface for the undo/redo state structure
 */
interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

// past 履歴の上限。長時間の試合入力でメモリが際限なく増えるのを防ぐ
const MAX_HISTORY_LENGTH = 50;

/**
 * Return type for the useUndoRedo hook
 */
export interface UseUndoRedoReturn<T> {
  /** Current state */
  state: T;
  /** Set new state (adds current to history). Accepts a value or an updater
   * function that receives the current present state, like React's setState. */
  set: (newState: T | ((prevState: T) => T)) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Reset history with new initial state */
  reset: (newState: T) => void;
}

/**
 * Hook for managing undo/redo functionality with history stack pattern.
 * Useful for implementing undo/redo in forms, editors, and game states.
 *
 * @param initialState - Initial state value
 * @returns Object with state, set, undo, redo, canUndo, canRedo, and reset
 *
 * @example
 * ```tsx
 * const { state, set, undo, redo, canUndo, canRedo } = useUndoRedo({ count: 0 });
 *
 * // Update state
 * set({ count: 1 });
 *
 * // Undo
 * if (canUndo) undo();
 *
 * // Redo
 * if (canRedo) redo();
 * ```
 */
export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // 単純な真偽比較なので useMemo による最適化は不要（計算コストがほぼゼロ）
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback((newStateOrUpdater: T | ((prevState: T) => T)) => {
    setHistory((prev) => {
      const newPresent =
        typeof newStateOrUpdater === 'function'
          ? (newStateOrUpdater as (prevState: T) => T)(prev.present)
          : newStateOrUpdater;

      const newPast = [...prev.past, prev.present];
      // 上限を超えた分は古い履歴から破棄する
      if (newPast.length > MAX_HISTORY_LENGTH) {
        newPast.splice(0, newPast.length - MAX_HISTORY_LENGTH);
      }

      return {
        past: newPast,
        present: newPresent,
        future: [], // Clear future on new change
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) {
        return prev;
      }

      const newPast = [...prev.past];
      const newPresent = newPast.pop()!;

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) {
        return prev;
      }

      const newFuture = [...prev.future];
      const newPresent = newFuture.shift()!;

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
