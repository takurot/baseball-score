import { getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { Game } from '../../types';
import { getCurrentUser } from '../authService';
import { saveGame, getSharedGameById } from '../gameService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  deleteDoc: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../config', () => ({ db: {} }));

jest.mock('../authService', () => ({ getCurrentUser: jest.fn() }));

const mockedGetDoc = getDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedAddDoc = addDoc as jest.Mock;
const mockedGetCurrentUser = getCurrentUser as jest.Mock;

const makeGame = (overrides: Partial<Game> = {}): Game =>
  ({
    id: 'game-1',
    date: '2026-08-17',
    currentInning: 1,
    homeTeam: { id: 'h', name: 'ホーム', players: [], atBats: [] },
    awayTeam: { id: 'a', name: 'アウェイ', players: [], atBats: [] },
    ...overrides,
  }) as Game;

describe('saveGame (update path)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentUser.mockReturnValue({
      uid: 'user-1',
      email: 'me@example.com',
    });
  });

  it('rejects when the existing game belongs to another user', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({ userId: 'someone-else' }),
    });

    await expect(saveGame(makeGame())).rejects.toThrow(
      'このデータにアクセスする権限がありません'
    );
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejects when the existing game does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    await expect(saveGame(makeGame())).rejects.toThrow(
      'データが見つかりません'
    );
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('updates own game without id and createdAt fields', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({ userId: 'user-1' }),
    });

    await saveGame(makeGame());

    expect(mockedUpdateDoc).toHaveBeenCalledTimes(1);
    const payload = mockedUpdateDoc.mock.calls[0][1];
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload.userId).toBe('user-1');
  });
});

describe('saveGame (create path)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentUser.mockReturnValue({
      uid: 'user-1',
      email: 'me@example.com',
    });
    mockedAddDoc.mockResolvedValue({ id: 'new-game' });
  });

  it('creates a new document without ownership lookup', async () => {
    await saveGame(makeGame({ id: '' }));

    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedAddDoc).toHaveBeenCalledTimes(1);
  });
});

describe('getSharedGameById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('strips owner userId and userEmail from the public payload', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({
        userId: 'owner-1',
        userEmail: 'owner@example.com',
        isPublic: true,
        date: '2026-08-17',
        currentInning: 5,
      }),
    });

    const game = await getSharedGameById('game-1');

    expect(game).not.toBeNull();
    expect(game).not.toHaveProperty('userId');
    expect(game).not.toHaveProperty('userEmail');
    expect(game?.id).toBe('game-1');
    expect(game?.date).toBe('2026-08-17');
  });

  it('rejects when the game is not public', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({ userId: 'owner-1', isPublic: false }),
    });

    await expect(getSharedGameById('game-1')).rejects.toThrow(
      'この試合データは公開されていません'
    );
  });
});
