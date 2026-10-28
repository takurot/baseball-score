import { Player, Team, TeamSetting } from '../types';

// Include historical references even when their roster entry has been removed.
export const getTeamPlayers = (team: Team): Player[] => {
  const players = new Map(team.players.map((player) => [player.id, player]));
  for (const atBat of team.atBats) {
    if (!players.has(atBat.playerId)) {
      players.set(atBat.playerId, {
        id: atBat.playerId,
        name: `名簿にない選手 (${atBat.playerId})`,
        number: '',
        position: '',
        isActive: false,
        order: 0,
      });
    }
  }
  return Array.from(players.values());
};

export const linkTeamRoster = (
  team: Team,
  registered: TeamSetting,
  mapping: Record<string, string>
): Team => {
  const roster = new Map((registered.players || []).map((p) => [p.id, p]));
  const players = new Map<string, Player>();
  for (const player of getTeamPlayers(team)) {
    const targetId = mapping[player.id];
    const target = targetId ? roster.get(targetId) : undefined;
    if (targetId && !target) throw new Error('対応先の選手が見つかりません');
    const updated = target
      ? {
          ...player,
          id: target.id,
          name: target.name,
          number: target.number,
          position: target.position,
        }
      : player;
    if (!players.has(updated.id)) players.set(updated.id, updated);
  }
  for (const player of Array.from(roster.values())) {
    if (!players.has(player.id)) {
      players.set(player.id, {
        id: player.id,
        name: player.name,
        number: player.number,
        position: player.position,
        isActive: true,
        order: 0,
      });
    }
  }
  return {
    ...team,
    id: registered.id,
    name: registered.name,
    players: Array.from(players.values()),
    atBats: team.atBats.map((atBat) => ({
      ...atBat,
      playerId: mapping[atBat.playerId] || atBat.playerId,
    })),
  };
};
