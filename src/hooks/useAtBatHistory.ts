import { useState, useCallback } from 'react';
import { AtBat } from '../types';

export const useAtBatHistory = (initialAtBats: AtBat[]) => {
  const [atBats, setAtBats] = useState<AtBat[]>(initialAtBats);

  const addAtBat = useCallback((atBat: AtBat) => {
    setAtBats((prev) => [...prev, atBat]);
  }, []);

  const updateAtBat = useCallback((updatedAtBat: AtBat) => {
    setAtBats((prev) =>
      prev.map((ab) => (ab.id === updatedAtBat.id ? updatedAtBat : ab))
    );
  }, []);

  const deleteAtBat = useCallback((atBatId: string) => {
    setAtBats((prev) => prev.filter((ab) => ab.id !== atBatId));
  }, []);

  return { atBats, addAtBat, updateAtBat, deleteAtBat, setAtBats };
};
