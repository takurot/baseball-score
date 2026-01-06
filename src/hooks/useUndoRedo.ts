import { useState, useCallback, useMemo } from 'react';

/**
 * Interface for the undo/redo state structure
 */
interface UndoRedoState<T> {
    past: T[];
    present: T;
    future: T[];
}

/**
 * Return type for the useUndoRedo hook
 */
export interface UseUndoRedoReturn<T> {
    /** Current state */
    state: T;
    /** Set new state (adds current to history) */
    set: (newState: T) => void;
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

    const canUndo = useMemo(() => history.past.length > 0, [history.past.length]);
    const canRedo = useMemo(
        () => history.future.length > 0,
        [history.future.length]
    );

    const set = useCallback((newState: T) => {
        setHistory((prev) => ({
            past: [...prev.past, prev.present],
            present: newState,
            future: [], // Clear future on new change
        }));
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
