import { getNextBatterPlayerId } from '../BattingOrder';
import { Team, Player, AtBat } from '../../types';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  name: '選手1',
  number: '1',
  position: 'CF',
  isActive: true,
  order: 1,
  ...overrides,
});

const makeAtBat = (overrides: Partial<AtBat> = {}): AtBat => ({
  id: 'ab1',
  playerId: 'p1',
  inning: 1,
  isTop: true,
  result: 'IH',
  rbi: 0,
  isOut: false,
  ...overrides,
});

const makeTeam = (players: Player[], atBats: AtBat[] = []): Team => ({
  id: 'team-1',
  name: 'チーム',
  players,
  atBats,
});

describe('getNextBatterPlayerId', () => {
  test('打席がまだない場合、打順1番の選手を返す', () => {
    const team = makeTeam([
      makePlayer({ id: 'p1', order: 1 }),
      makePlayer({ id: 'p2', order: 2 }),
      makePlayer({ id: 'p3', order: 3 }),
    ]);

    expect(getNextBatterPlayerId(team)).toBe('p1');
  });

  test('打席数に応じて次の打順の選手を返す', () => {
    const team = makeTeam(
      [
        makePlayer({ id: 'p1', order: 1 }),
        makePlayer({ id: 'p2', order: 2 }),
        makePlayer({ id: 'p3', order: 3 }),
      ],
      [makeAtBat({ id: 'ab1', playerId: 'p1' })]
    );

    expect(getNextBatterPlayerId(team)).toBe('p2');
  });

  test('打順は打者一巡後も継続する', () => {
    const team = makeTeam(
      [
        makePlayer({ id: 'p1', order: 1 }),
        makePlayer({ id: 'p2', order: 2 }),
        makePlayer({ id: 'p3', order: 3 }),
      ],
      [
        makeAtBat({ id: 'ab1', playerId: 'p1' }),
        makeAtBat({ id: 'ab2', playerId: 'p2' }),
        makeAtBat({ id: 'ab3', playerId: 'p3' }),
      ]
    );

    expect(getNextBatterPlayerId(team)).toBe('p1');
  });

  test('打順が未設定（order: 0）の選手は対象外', () => {
    const team = makeTeam([
      makePlayer({ id: 'p1', order: 0 }),
      makePlayer({ id: 'p2', order: 1 }),
    ]);

    expect(getNextBatterPlayerId(team)).toBe('p2');
  });

  test('控え（isActive: false）の選手は対象外', () => {
    const team = makeTeam([
      makePlayer({ id: 'p1', order: 1, isActive: false }),
      makePlayer({ id: 'p2', order: 2, isActive: true }),
    ]);

    expect(getNextBatterPlayerId(team)).toBe('p2');
  });

  test('打順が設定された出場選手がいない場合は null を返す', () => {
    const team = makeTeam([makePlayer({ id: 'p1', order: 0 })]);

    expect(getNextBatterPlayerId(team)).toBeNull();
  });

  test('打順は数値順ではなく設定順（order の昇順）で解決する', () => {
    const team = makeTeam([
      makePlayer({ id: 'p3', order: 3 }),
      makePlayer({ id: 'p1', order: 1 }),
      makePlayer({ id: 'p2', order: 2 }),
    ]);

    expect(getNextBatterPlayerId(team)).toBe('p1');
  });
});
