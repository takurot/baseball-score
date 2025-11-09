import { renderHook, act } from '@testing-library/react';
import { useTeamManagement } from '../useTeamManagement';
import { Team } from '../../types';
import { v4 as uuidv4 } from 'uuid';

Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: (arr: any) => require('crypto').randomBytes(arr.length),
  },
});

const initialTeams: Team[] = [
  {
    id: 'team1',
    name: 'Team A',
    players: [
      {
        id: 'p1',
        name: 'Player 1',
        number: '1',
        position: 'P',
        isActive: true,
        order: 1,
      },
      {
        id: 'p2',
        name: 'Player 2',
        number: '2',
        position: 'C',
        isActive: true,
        order: 2,
      },
    ],
    atBats: [],
  },
];

describe('useTeamManagement', () => {
  test('addPlayer should add a player to the correct team', () => {
    const { result } = renderHook(() => useTeamManagement(initialTeams));

    act(() => {
      result.current.addPlayer('team1', 'New Player', '3');
    });

    const updatedTeam = result.current.teams.find((t) => t.id === 'team1');
    expect(updatedTeam?.players).toHaveLength(3);
    expect(updatedTeam?.players[2].name).toBe('New Player');
  });

  test('removePlayer should remove a player from the correct team', () => {
    const { result } = renderHook(() => useTeamManagement(initialTeams));

    act(() => {
      result.current.removePlayer('team1', 'p1');
    });

    const updatedTeam = result.current.teams.find((t) => t.id === 'team1');
    expect(updatedTeam?.players).toHaveLength(1);
    expect(updatedTeam?.players.find((p) => p.id === 'p1')).toBeUndefined();
  });

  test('updatePlayerOrder should reorder players', () => {
    const { result } = renderHook(() => useTeamManagement(initialTeams));
    const reorderedPlayers = [
      result.current.teams[0].players[1],
      result.current.teams[0].players[0],
    ];

    act(() => {
      result.current.updatePlayerOrder('team1', reorderedPlayers);
    });

    const updatedTeam = result.current.teams.find((t) => t.id === 'team1');
    expect(updatedTeam?.players[0].id).toBe('p2');
    expect(updatedTeam?.players[1].id).toBe('p1');
  });

  test('updateTeamName should update the team name', () => {
    const { result } = renderHook(() => useTeamManagement(initialTeams));

    act(() => {
      result.current.updateTeamName('team1', 'New Team Name');
    });

    const updatedTeam = result.current.teams.find((t) => t.id === 'team1');
    expect(updatedTeam?.name).toBe('New Team Name');
  });
});
