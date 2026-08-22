import { useState, useCallback } from 'react';
import { AtBat } from '../types';

export const useAtBatHistory = (initialAtBats: AtBat[]) => {
  const [atBats, setAtBats] = useState<AtBat[]>(initialAtBats);

  const warn = useCallback((message: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(message);
    }
  }, []);

  const addAtBat = useCallback(
    (atBat: AtBat) => {
      setAtBats((prev) => {
        if (prev.some((existing) => existing.id === atBat.id)) {
          warn(`Duplicate at-bat id ignored: ${atBat.id}`);
          return prev;
        }
        return [...prev, atBat];
      });
    },
    [warn]
  );

  const updateAtBat = useCallback(
    (updatedAtBat: AtBat) => {
      setAtBats((prev) => {
        if (!prev.some((atBat) => atBat.id === updatedAtBat.id)) {
          warn(`At-bat id not found for update: ${updatedAtBat.id}`);
          return prev;
        }
        return prev.map((atBat) =>
          atBat.id === updatedAtBat.id ? updatedAtBat : atBat
        );
      });
    },
    [warn]
  );

  const deleteAtBat = useCallback(
    (atBatId: string) => {
      setAtBats((prev) => {
        if (!prev.some((atBat) => atBat.id === atBatId)) {
          warn(`At-bat id not found for deletion: ${atBatId}`);
          return prev;
        }
        return prev.filter((atBat) => atBat.id !== atBatId);
      });
    },
    [warn]
  );

  const resetAtBats = useCallback(
    (nextAtBats: AtBat[]) => {
      const seenIds = new Set<string>();
      const uniqueAtBats = nextAtBats.filter((atBat) => {
        if (seenIds.has(atBat.id)) {
          warn(`Duplicate at-bat id ignored during reset: ${atBat.id}`);
          return false;
        }
        seenIds.add(atBat.id);
        return true;
      });
      setAtBats(uniqueAtBats);
    },
    [warn]
  );

  return { atBats, addAtBat, updateAtBat, deleteAtBat, resetAtBats };
};
