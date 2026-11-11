import { linkTeamRoster, getTeamPlayers } from './TeamRoster';
import { Team, TeamSetting } from '../types';

const player = (id: string) => ({
  id,
  name: '同名',
  number: '1',
  position: 'P',
  isActive: false,
  order: 0,
});
const registered: TeamSetting = {
  id: 'registered',
  name: '登録',
  userId: 'u',
  players: [player('canonical'), player('other')],
};
const team: Team = {
  id: '',
  name: '過去',
  players: [player('old'), player('separate')],
  atBats: [
    {
      id: 'ab1',
      playerId: 'old',
      result: 'HR',
      inning: 2,
      isTop: true,
      rbi: 3,
      isOut: false,
      description: '記録',
      timestamp: 123,
    },
    {
      id: 'ab2',
      playerId: 'missing',
      result: 'SO',
      inning: 3,
      isTop: true,
      rbi: 0,
      isOut: true,
    },
  ],
};

test('explicit linking preserves every at-bat field except the mapped player ID', () => {
  const result = linkTeamRoster(team, registered, { old: 'canonical' });
  expect(result.id).toBe('registered');
  expect(result.atBats).toEqual([
    { ...team.atBats[0], playerId: 'canonical' },
    team.atBats[1],
  ]);
  expect(result.players.find((p) => p.id === 'canonical')).toMatchObject({
    isActive: false,
    order: 0,
  });
  expect(result.players.map((p) => p.id)).toEqual([
    'canonical',
    'separate',
    'missing',
    'other',
  ]);
  expect(team.atBats[0].playerId).toBe('old');
  expect(
    linkTeamRoster(result, registered, { canonical: 'canonical' })
  ).toEqual(result);
});

test('same names are never merged without selection, including removed and orphan players', () => {
  const result = linkTeamRoster(team, registered, {});
  expect(result.players.map((p) => p.id)).toEqual([
    'old',
    'separate',
    'missing',
    'canonical',
    'other',
  ]);
  expect(result.atBats).toEqual(team.atBats);
  expect(getTeamPlayers(team).find((p) => p.id === 'missing')?.name).toContain(
    'missing'
  );
});

test('duplicate IDs and explicit many-to-one links produce one roster entry without duplicating at-bats', () => {
  const result = linkTeamRoster(
    { ...team, players: [...team.players, team.players[0]] },
    registered,
    { old: 'canonical', separate: 'canonical' }
  );
  expect(result.players.filter((p) => p.id === 'canonical')).toHaveLength(1);
  expect(result.atBats).toHaveLength(2);
});

test('unknown target ID is rejected rather than silently assigning records', () => {
  expect(() =>
    linkTeamRoster(team, registered, { old: 'nonexistent' })
  ).toThrow();
});

test('merging a reserve before a starter preserves active status and batting order', () => {
  const roster = {
    ...team,
    players: [
      player('old'),
      { ...player('separate'), isActive: true, order: 4 },
    ],
  };
  const result = linkTeamRoster(roster, registered, {
    old: 'canonical',
    separate: 'canonical',
  });
  expect(result.players.find((p) => p.id === 'canonical')).toMatchObject({
    isActive: true,
    order: 4,
  });
  const reversed = linkTeamRoster(
    { ...roster, players: [...roster.players].reverse() },
    registered,
    { old: 'canonical', separate: 'canonical' }
  );
  expect(reversed).toEqual(result);
});

test('explicitly merging two batting orders keeps the lower positive order', () => {
  const result = linkTeamRoster(
    {
      ...team,
      players: [
        { ...player('old'), isActive: true, order: 4 },
        { ...player('separate'), isActive: true, order: 2 },
      ],
    },
    registered,
    { old: 'canonical', separate: 'canonical' }
  );
  expect(result.players.find((p) => p.id === 'canonical')).toMatchObject({
    isActive: true,
    order: 2,
  });
  expect(result.atBats).toHaveLength(team.atBats.length);
});
