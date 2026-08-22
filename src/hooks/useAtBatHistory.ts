import { useState, useCallback, useRef } from 'react';
import { AtBat } from '../types';

const deduplicateAtBats = (
  atBats: AtBat[],
  onDuplicate?: (atBatId: string) => void
): AtBat[] => {
  const seenIds = new Set<string>();
  return atBats.filter((atBat) => {
    if (seenIds.has(atBat.id)) {
      onDuplicate?.(atBat.id);
      return false;
    }
    seenIds.add(atBat.id);
    return true;
  });
};

const hasAtBatId = (atBats: AtBat[], atBatId: string): boolean =>
  atBats.some((atBat) => atBat.id === atBatId);

const warn = (message: string): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message);
  }
};

export const useAtBatHistory = (initialAtBats: AtBat[]) => {
  const [atBats, setAtBats] = useState<AtBat[]>(() =>
    deduplicateAtBats(initialAtBats)
  );
  const atBatsRef = useRef(atBats);

  const applyAtBatUpdate = useCallback(
    (update: (previous: AtBat[]) => AtBat[]) => {
      atBatsRef.current = update(atBatsRef.current);
      setAtBats(update);
    },
    []
  );

  const addAtBat = useCallback(
    (atBat: AtBat) => {
      if (hasAtBatId(atBatsRef.current, atBat.id)) {
        warn(`Duplicate at-bat id ignored: ${atBat.id}`);
        return;
      }
      applyAtBatUpdate((prev) =>
        hasAtBatId(prev, atBat.id) ? prev : [...prev, atBat]
      );
    },
    [applyAtBatUpdate]
  );

  const updateAtBat = useCallback(
    (updatedAtBat: AtBat) => {
      if (!hasAtBatId(atBatsRef.current, updatedAtBat.id)) {
        warn(`At-bat id not found for update: ${updatedAtBat.id}`);
      }
      applyAtBatUpdate((prev) =>
        hasAtBatId(prev, updatedAtBat.id)
          ? prev.map((atBat) =>
              atBat.id === updatedAtBat.id ? updatedAtBat : atBat
            )
          : prev
      );
    },
    [applyAtBatUpdate]
  );

  const deleteAtBat = useCallback(
    (atBatId: string) => {
      if (!hasAtBatId(atBatsRef.current, atBatId)) {
        warn(`At-bat id not found for deletion: ${atBatId}`);
      }
      applyAtBatUpdate((prev) =>
        hasAtBatId(prev, atBatId)
          ? prev.filter((atBat) => atBat.id !== atBatId)
          : prev
      );
    },
    [applyAtBatUpdate]
  );

  const resetAtBats = useCallback(
    (nextAtBats: AtBat[]) => {
      const uniqueAtBats = deduplicateAtBats(nextAtBats, (atBatId) =>
        warn(`Duplicate at-bat id ignored during reset: ${atBatId}`)
      );
      applyAtBatUpdate(() => uniqueAtBats);
    },
    [applyAtBatUpdate]
  );

  return { atBats, addAtBat, updateAtBat, deleteAtBat, resetAtBats };
};
