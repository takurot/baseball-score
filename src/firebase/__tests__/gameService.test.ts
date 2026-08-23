import { getDoc, updateDoc, addDoc, getDocs, limit } from 'firebase/firestore';
import { Game } from '../../types';
import { getCurrentUser } from '../authService';
import {
  saveGame,
  getSharedGameById,
  getGameById,
  getAllGames,
} from '../gameService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn((n: number) => `LIMIT_${n}`),
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
const mockedGetDocs = getDocs as jest.Mock;
const mockedLimit = limit as jest.Mock;
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

    // getGameById は「存在しない」と「他人のデータ」を区別せず null を返すため、
    // どちらの場合も同じ「データが見つかりません」で失敗する（統一された契約）
    await expect(saveGame(makeGame())).rejects.toThrow(
      'データが見つかりません'
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

describe('getGameById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentUser.mockReturnValue({
      uid: 'user-1',
      email: 'me@example.com',
    });
  });

  it('returns null (not throw) when the document does not exist', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    await expect(getGameById('missing')).resolves.toBeNull();
  });

  it('returns null (not throw) when the document belongs to another user', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({ userId: 'someone-else' }),
    });

    // 「存在しない」場合と同じ null を返し、他ユーザーへドキュメントの
    // 存在有無を区別して伝えない
    await expect(getGameById('game-1')).resolves.toBeNull();
  });

  it('returns the game when it belongs to the current user', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'game-1',
      data: () => ({ userId: 'user-1', date: '2026-08-17' }),
    });

    const game = await getGameById('game-1');
    expect(game?.id).toBe('game-1');
    expect(game?.date).toBe('2026-08-17');
  });
});

describe('getAllGames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentUser.mockReturnValue({
      uid: 'user-1',
      email: 'me@example.com',
    });
    mockedGetDocs.mockResolvedValue({ docs: [] });
  });

  it('caps the query with limit() to avoid an unbounded fetch', async () => {
    await getAllGames();

    expect(mockedLimit).toHaveBeenCalledWith(expect.any(Number));
  });
});
