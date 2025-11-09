import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { AtBat, Game, RunEvent, OutEvent } from '../../types';

describe('useGameState', () => {
  test('initial state is set correctly', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.state.currentInning).toBe(1);
    expect(result.current.state.isTop).toBe(true);
    expect(result.current.state.outs).toBe(0);
    expect(result.current.state.runners).toEqual({ first: false, second: false, third: false });
  });

  test('updateInning action works correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.updateInning(2, false);
    });

    expect(result.current.state.currentInning).toBe(2);
    expect(result.current.state.isTop).toBe(false);
    expect(result.current.state.outs).toBe(0);
    expect(result.current.state.runners).toEqual({ first: false, second: false, third: false });
  });

  test('resetGame action works correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.updateInning(5, false);
    });

    act(() => {
      result.current.actions.resetGame();
    });

    expect(result.current.state.currentInning).toBe(1);
    expect(result.current.state.isTop).toBe(true);
    expect(result.current.state.runEvents).toHaveLength(0);
    expect(result.current.state.outEvents).toHaveLength(0);
  });

  test('loadGame action works correctly', () => {
    const { result } = renderHook(() => useGameState());

    const savedGame: Partial<Game> = {
      homeTeam: { id: 'home', name: 'Home Team', players: [], atBats: [] },
      awayTeam: { id: 'away', name: 'Away Team', players: [], atBats: [] },
      currentInning: 3,
      isTop: false,
    };

    act(() => {
      result.current.actions.loadGame(savedGame as Game);
    });

    expect(result.current.state.homeTeam.name).toBe('Home Team');
    expect(result.current.state.currentInning).toBe(3);
    expect(result.current.state.isTop).toBe(false);
  });

  test('addAtBat action works correctly', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.setAwayTeam({
        id: 'test-team',
        name: 'Test Team',
        players: [{ id: 'p1', name: 'Player 1', number: '1', position: 'P', isActive: true, order: 1 }],
        atBats: [],
      });
    });

    const atBat: AtBat = {
      id: 'atbat1',
      playerId: 'p1',
      result: 'IH',
      inning: 1,
      isTop: true,
      rbi: 0,
      isOut: false,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.actions.addAtBat(atBat);
    });

    expect(result.current.state.awayTeam.atBats).toHaveLength(1);
    expect(result.current.state.awayTeam.atBats[0]).toEqual(atBat);
  });

  test('addAtBat action increments outs', () => {
    const { result } = renderHook(() => useGameState());
    const atBat: AtBat = {
      id: 'atbat1',
      playerId: 'p1',
      result: 'SO',
      inning: 1,
      isTop: true,
      rbi: 0,
      isOut: true,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.actions.addAtBat(atBat);
    });

    expect(result.current.state.outs).toBe(1);
  });

  test('3 outs change the inning', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.addAtBat({ id: 'ab1', playerId: 'p1', result: 'SO', inning: 1, isTop: true, rbi: 0, isOut: true });
    });
    act(() => {
      result.current.actions.addAtBat({ id: 'ab2', playerId: 'p2', result: 'SO', inning: 1, isTop: true, rbi: 0, isOut: true });
    });

    expect(result.current.state.outs).toBe(2);

    act(() => {
      result.current.actions.addAtBat({ id: 'ab3', playerId: 'p3', result: 'SO', inning: 1, isTop: true, rbi: 0, isOut: true });
    });

    expect(result.current.state.currentInning).toBe(1);
    expect(result.current.state.isTop).toBe(false);
    expect(result.current.state.outs).toBe(0);
  });

  test('hit moves runner', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.addAtBat({ id: 'ab1', playerId: 'p1', result: 'IH', inning: 1, isTop: true, rbi: 0, isOut: false });
    });

    expect(result.current.state.runners).toEqual({ first: true, second: false, third: false });
  });

  test('updateAtBat replaces existing record', () => {
    const { result } = renderHook(() => useGameState());

    const atBat: AtBat = {
      id: 'ab1',
      playerId: 'p1',
      result: 'IH',
      inning: 1,
      isTop: true,
      rbi: 0,
      isOut: false,
    };

    act(() => {
      result.current.actions.addAtBat(atBat);
    });

    const updated: AtBat = {
      ...atBat,
      result: 'HR',
      rbi: 1,
    };

    act(() => {
      result.current.actions.updateAtBat(updated);
    });

    expect(result.current.state.awayTeam.atBats[0]).toEqual(updated);
  });

  test('deleteAtBat removes record from appropriate team', () => {
    const { result } = renderHook(() => useGameState());

    const awayAtBat: AtBat = {
      id: 'away',
      playerId: 'p1',
      result: 'IH',
      inning: 1,
      isTop: true,
      rbi: 0,
      isOut: false,
    };

    const homeAtBat: AtBat = {
      id: 'home',
      playerId: 'p2',
      result: 'IH',
      inning: 1,
      isTop: false,
      rbi: 0,
      isOut: false,
    };

    act(() => {
      result.current.actions.addAtBat(awayAtBat);
      result.current.actions.addAtBat(homeAtBat);
    });

    act(() => {
      result.current.actions.deleteAtBat('away');
    });

    expect(result.current.state.awayTeam.atBats).toHaveLength(0);
    expect(result.current.state.homeTeam.atBats).toHaveLength(1);
  });

  test('run events can be added and removed', () => {
    const { result } = renderHook(() => useGameState());
    const runEvent: RunEvent = {
      id: 're1',
      inning: 1,
      isTop: true,
      runType: '押し出し',
      runCount: 1,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.actions.addRunEvent(runEvent);
    });
    expect(result.current.state.runEvents).toHaveLength(1);

    act(() => {
      result.current.actions.deleteRunEvent('re1');
    });
    expect(result.current.state.runEvents).toHaveLength(0);
  });

  test('out events can be added and removed', () => {
    const { result } = renderHook(() => useGameState());
    const outEvent: OutEvent = {
      id: 'oe1',
      inning: 2,
      isTop: false,
      outType: '牽制アウト',
      timestamp: Date.now(),
    };

    act(() => {
      result.current.actions.addOutEvent(outEvent);
    });
    expect(result.current.state.outEvents).toHaveLength(1);

    act(() => {
      result.current.actions.deleteOutEvent('oe1');
    });
    expect(result.current.state.outEvents).toHaveLength(0);
  });

  test('metadata setters update state', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.actions.setGameId('game-123');
      result.current.actions.setDate('2025-01-01');
      result.current.actions.setVenue('Tokyo Dome');
      result.current.actions.setTournament('Winter Cup');
    });

    expect(result.current.state.id).toBe('game-123');
    expect(result.current.state.date).toBe('2025-01-01');
    expect(result.current.state.venue).toBe('Tokyo Dome');
    expect(result.current.state.tournament).toBe('Winter Cup');
  });
});

