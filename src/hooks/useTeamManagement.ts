import { useState, useCallback } from 'react';
import { Team, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface TeamManagementActions {
  addPlayer: (teamId: string, name: string, number: string) => void;
  removePlayer: (teamId: string, playerId: string) => void;
  updatePlayerOrder: (teamId: string, players: Player[]) => void;
  updateTeamName: (teamId: string, newName: string) => void;
}

export const useTeamManagement = (initialTeams: Team[]) => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);

  const addPlayer = useCallback((teamId: string, name: string, number: string) => {
    setTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.id === teamId) {
          const newPlayer: Player = {
            id: uuidv4(),
            name,
            number,
            position: '',
            isActive: true,
            order: team.players.length + 1,
          };
          return { ...team, players: [...team.players, newPlayer] };
        }
        return team;
      })
    );
  }, []);

  const removePlayer = useCallback((teamId: string, playerId: string) => {
    setTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            players: team.players.filter(p => p.id !== playerId),
          };
        }
        return team;
      })
    );
  }, []);

  const updatePlayerOrder = useCallback((teamId: string, players: Player[]) => {
    setTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.id === teamId) {
          return { ...team, players };
        }
        return team;
      })
    );
  }, []);

  const updateTeamName = useCallback((teamId: string, newName: string) => {
    setTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.id === teamId) {
          return { ...team, name: newName };
        }
        return team;
      })
    );
  }, []);

  return { teams, addPlayer, removePlayer, updatePlayerOrder, updateTeamName };
};

