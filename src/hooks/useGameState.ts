import { useCallback } from 'react';
import { Game, Team, AtBat, RunEvent, OutEvent } from '../types';
import { useUndoRedo } from './useUndoRedo';

type RunnerState = { first: boolean; second: boolean; third: boolean };

export interface GameState {
  id: string;
  date: string;
  venue: string;
  tournament: string;
  homeTeam: Team;
  awayTeam: Team;
  currentInning: number;
  isTop: boolean;
  outs: number;
  runners: RunnerState;
  runEvents: RunEvent[];
  outEvents: OutEvent[];
}

export interface GameStateActions {
  setGameId: (id: string) => void;
  setDate: (date: string) => void;
  setVenue: (venue: string) => void;
  setTournament: (tournament: string) => void;
  setHomeTeam: (team: Team) => void;
  setAwayTeam: (team: Team) => void;
  addAtBat: (atBat: AtBat) => void;
  updateAtBat: (atBat: AtBat) => void;
  deleteAtBat: (atBatId: string) => void;
  addRunEvent: (event: RunEvent) => void;
  deleteRunEvent: (eventId: string) => void;
  addOutEvent: (event: OutEvent) => void;
  deleteOutEvent: (eventId: string) => void;
  updateInning: (inning: number, isTop: boolean) => void;
  resetGame: () => void;
  loadGame: (game: Game) => void;
}

// 打席登録・削除、得点/アウトイベント追加などの取り消し・やり直し操作
export interface GameStateHistory {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export interface UseGameStateReturn {
  state: GameState;
  actions: GameStateActions;
  history: GameStateHistory;
}

const emptyRunners = (): RunnerState => ({
  first: false,
  second: false,
  third: false,
});

const normalizeTeam = (team?: Team): Team => ({
  id: team?.id ?? '',
  name: team?.name ?? '',
  players: team?.players ?? [],
  atBats: team?.atBats ?? [],
});

const todayISO = () => new Date().toISOString().split('T')[0];

const buildInitialState = (game?: Game): GameState => ({
  id: game?.id ?? '',
  date: game?.date ?? todayISO(),
  venue: game?.venue ?? '',
  tournament: game?.tournament ?? '',
  homeTeam: normalizeTeam(game?.homeTeam),
  awayTeam: normalizeTeam(game?.awayTeam),
  currentInning: game?.currentInning ?? 1,
  isTop: game?.isTop ?? true,
  outs: 0,
  runners: emptyRunners(),
  runEvents: game?.runEvents ? [...game.runEvents] : [],
  outEvents: game?.outEvents ? [...game.outEvents] : [],
});

const getBaseAdvancement = (result: AtBat['result']): number => {
  switch (result) {
    case 'IH':
    case 'LH':
    case 'CH':
    case 'RH':
    case 'BB':
    case 'HBP':
    case 'E':
    case 'FC':
      return 1;
    case '2B':
      return 2;
    case '3B':
      return 3;
    case 'HR':
      return 4;
    default:
      return 0;
  }
};

const advanceRunners = (runners: RunnerState, bases: number): RunnerState => {
  if (bases <= 0) {
    return runners;
  }

  if (bases >= 4) {
    return emptyRunners();
  }

  const next: RunnerState = { ...runners };

  if (next.third) {
    next.third = false;
  }

  if (next.second) {
    if (bases >= 2) {
      next.second = false;
    } else if (bases === 1) {
      next.second = false;
      next.third = true;
    }
  }

  if (next.first) {
    if (bases >= 3) {
      next.first = false;
    } else if (bases === 2) {
      next.first = false;
      next.third = true;
    } else {
      next.first = false;
      next.second = true;
    }
  }

  if (bases === 1) {
    next.first = true;
  } else if (bases === 2) {
    next.second = true;
  } else if (bases === 3) {
    next.third = true;
  }

  return next;
};

export const useGameState = (initialGame?: Game): UseGameStateReturn => {
  const {
    state,
    set: setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoRedo<GameState>(buildInitialState(initialGame));

  const setHomeTeam = useCallback(
    (team: Team) => {
      setState((prev) => ({
        ...prev,
        homeTeam: normalizeTeam(team),
      }));
    },
    [setState]
  );

  const setAwayTeam = useCallback(
    (team: Team) => {
      setState((prev) => ({
        ...prev,
        awayTeam: normalizeTeam(team),
      }));
    },
    [setState]
  );

  const setGameId = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        id,
      }));
    },
    [setState]
  );

  const setDate = useCallback(
    (date: string) => {
      setState((prev) => ({
        ...prev,
        date,
      }));
    },
    [setState]
  );

  const setVenue = useCallback(
    (venue: string) => {
      setState((prev) => ({
        ...prev,
        venue,
      }));
    },
    [setState]
  );

  const setTournament = useCallback(
    (tournament: string) => {
      setState((prev) => ({
        ...prev,
        tournament,
      }));
    },
    [setState]
  );

  const updateInning = useCallback(
    (inning: number, isTop: boolean) => {
      setState((prev) => ({
        ...prev,
        currentInning: inning,
        isTop,
        outs: 0,
        runners: emptyRunners(),
      }));
    },
    [setState]
  );

  const addAtBat = useCallback(
    (atBat: AtBat) => {
      setState((prev) => {
        const teamKey = atBat.isTop ? 'awayTeam' : 'homeTeam';
        const targetTeam = prev[teamKey];
        const updatedTeam: Team = {
          ...targetTeam,
          atBats: [...targetTeam.atBats, atBat],
        };

        let nextState: GameState = {
          ...prev,
          [teamKey]: updatedTeam,
        };

        if (atBat.isOut) {
          const newOuts = prev.outs + 1;
          if (newOuts >= 3) {
            const nextInning = prev.isTop
              ? prev.currentInning
              : prev.currentInning + 1;
            nextState = {
              ...nextState,
              outs: 0,
              runners: emptyRunners(),
              currentInning: nextInning,
              isTop: !prev.isTop,
            };
          } else {
            nextState = {
              ...nextState,
              outs: newOuts,
            };
          }
        } else {
          const bases = getBaseAdvancement(atBat.result);
          nextState = {
            ...nextState,
            runners: advanceRunners(prev.runners, bases),
          };
        }

        return nextState;
      });
    },
    [setState]
  );

  const updateAtBat = useCallback(
    (updatedAtBat: AtBat) => {
      setState((prev) => {
        const updateTeam = (team: Team): Team => ({
          ...team,
          atBats: team.atBats.map((ab) =>
            ab.id === updatedAtBat.id ? updatedAtBat : ab
          ),
        });

        if (prev.homeTeam.atBats.some((ab) => ab.id === updatedAtBat.id)) {
          return { ...prev, homeTeam: updateTeam(prev.homeTeam) };
        }
        if (prev.awayTeam.atBats.some((ab) => ab.id === updatedAtBat.id)) {
          return { ...prev, awayTeam: updateTeam(prev.awayTeam) };
        }
        return prev;
      });
    },
    [setState]
  );

  const deleteAtBat = useCallback(
    (atBatId: string) => {
      setState((prev) => {
        if (prev.homeTeam.atBats.some((ab) => ab.id === atBatId)) {
          return {
            ...prev,
            homeTeam: {
              ...prev.homeTeam,
              atBats: prev.homeTeam.atBats.filter((ab) => ab.id !== atBatId),
            },
          };
        }
        if (prev.awayTeam.atBats.some((ab) => ab.id === atBatId)) {
          return {
            ...prev,
            awayTeam: {
              ...prev.awayTeam,
              atBats: prev.awayTeam.atBats.filter((ab) => ab.id !== atBatId),
            },
          };
        }
        return prev;
      });
    },
    [setState]
  );

  const addRunEvent = useCallback(
    (event: RunEvent) => {
      setState((prev) => ({
        ...prev,
        runEvents: [...prev.runEvents, event],
      }));
    },
    [setState]
  );

  const deleteRunEvent = useCallback(
    (eventId: string) => {
      setState((prev) => ({
        ...prev,
        runEvents: prev.runEvents.filter((event) => event.id !== eventId),
      }));
    },
    [setState]
  );

  const addOutEvent = useCallback(
    (event: OutEvent) => {
      setState((prev) => ({
        ...prev,
        outEvents: [...prev.outEvents, event],
      }));
    },
    [setState]
  );

  const deleteOutEvent = useCallback(
    (eventId: string) => {
      setState((prev) => ({
        ...prev,
        outEvents: prev.outEvents.filter((event) => event.id !== eventId),
      }));
    },
    [setState]
  );

  const resetGame = useCallback(() => {
    // 新しい試合を開始する際は、前の試合の undo/redo 履歴も破棄する
    resetHistory(buildInitialState());
  }, [resetHistory]);

  const loadGame = useCallback(
    (game: Game) => {
      // 別の試合を読み込む際は、以前の試合の undo/redo 履歴も破棄する
      resetHistory(buildInitialState(game));
    },
    [resetHistory]
  );

  return {
    state,
    actions: {
      setGameId,
      setDate,
      setVenue,
      setTournament,
      setHomeTeam,
      setAwayTeam,
      addAtBat,
      updateAtBat,
      deleteAtBat,
      addRunEvent,
      deleteRunEvent,
      addOutEvent,
      deleteOutEvent,
      updateInning,
      resetGame,
      loadGame,
    },
    history: {
      canUndo,
      canRedo,
      undo,
      redo,
    },
  };
};
