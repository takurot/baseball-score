import { useState, useCallback } from 'react';
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

export const useAtBatHistory = (initialAtBats: AtBat[]) => {
  const [atBats, setAtBats] = useState<AtBat[]>(() =>
    deduplicateAtBats(initialAtBats)
  );

  const warn = useCallback((message: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(message);
    }
  }, []);

  const addAtBat = useCallback(
    (atBat: AtBat) => {
      if (atBats.some((existing) => existing.id === atBat.id)) {
        warn(`Duplicate at-bat id ignored: ${atBat.id}`);
        return;
      }
      setAtBats((prev) =>
        prev.some((existing) => existing.id === atBat.id)
          ? prev
          : [...prev, atBat]
      );
    },
    [atBats, warn]
  );

  const updateAtBat = useCallback(
    (updatedAtBat: AtBat) => {
      if (!atBats.some((atBat) => atBat.id === updatedAtBat.id)) {
        warn(`At-bat id not found for update: ${updatedAtBat.id}`);
        return;
      }
      setAtBats((prev) =>
        prev.some((atBat) => atBat.id === updatedAtBat.id)
          ? prev.map((atBat) =>
              atBat.id === updatedAtBat.id ? updatedAtBat : atBat
            )
          : prev
      );
    },
    [atBats, warn]
  );

  const deleteAtBat = useCallback(
    (atBatId: string) => {
      if (!atBats.some((atBat) => atBat.id === atBatId)) {
        warn(`At-bat id not found for deletion: ${atBatId}`);
        return;
      }
      setAtBats((prev) =>
        prev.some((atBat) => atBat.id === atBatId)
          ? prev.filter((atBat) => atBat.id !== atBatId)
          : prev
      );
    },
    [atBats, warn]
  );

  const resetAtBats = useCallback(
    (nextAtBats: AtBat[]) => {
      const uniqueAtBats = deduplicateAtBats(nextAtBats, (atBatId) =>
        warn(`Duplicate at-bat id ignored during reset: ${atBatId}`)
      );
      setAtBats(uniqueAtBats);
    },
    [warn]
  );

  return { atBats, addAtBat, updateAtBat, deleteAtBat, resetAtBats };
};
