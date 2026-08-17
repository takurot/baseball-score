import {
  getDoc,
  updateDoc,
  runTransaction,
  doc as docFn,
  serverTimestamp,
} from 'firebase/firestore';
import { PlayerSetting, TeamSetting } from '../../types';
import { getCurrentUser } from '../authService';
import {
  updateTeam,
  addPlayerToTeam,
  removePlayerFromTeam,
  updatePlayerInTeam,
} from '../teamService';

const mockTransaction = { get: jest.fn(), update: jest.fn() };

// jsdom 環境には Web Crypto のグローバルがないためスタブする
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'generated-player-id' },
  configurable: true,
  writable: true,
});

// react-scripts の jest 設定は resetMocks: true のため、
// 実装はモジュールファクトリではなく beforeEach で設定する
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../config', () => ({ db: {} }));

jest.mock('../authService', () => ({ getCurrentUser: jest.fn() }));

const mockedGetDoc = getDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedRunTransaction = runTransaction as jest.Mock;
const mockedDoc = docFn as jest.Mock;
const mockedServerTimestamp = serverTimestamp as jest.Mock;
const mockedGetCurrentUser = getCurrentUser as jest.Mock;

const makePlayer = (id: string, name: string): PlayerSetting => ({
  id,
  name,
  number: '1',
  position: '投',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const ownTeamDoc = () => ({
  exists: () => true,
  id: 'team-1',
  data: () =>
    ({
      name: 'マイチーム',
      players: [makePlayer('p1', '山田'), makePlayer('p2', '鈴木')],
      userId: 'user-1',
      userEmail: 'me@example.com',
      createdAt: 'CREATED_AT',
    }) as TeamSetting,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCurrentUser.mockReturnValue({
    uid: 'user-1',
    email: 'me@example.com',
  });
  mockedDoc.mockReturnValue({});
  mockedServerTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  mockedRunTransaction.mockImplementation((_db, callback) =>
    callback(mockTransaction)
  );
  mockTransaction.get.mockResolvedValue(ownTeamDoc());
});

describe('updateTeam', () => {
  it('strips protected fields from the update payload', async () => {
    mockedGetDoc.mockResolvedValue(ownTeamDoc());

    await updateTeam('team-1', {
      name: '新しい名前',
      id: 'evil-id',
      userId: 'evil-user',
      userEmail: 'evil@example.com',
      createdAt: 'evil-created-at',
    } as Partial<TeamSetting>);

    expect(mockedUpdateDoc).toHaveBeenCalledTimes(1);
    const payload = mockedUpdateDoc.mock.calls[0][1];
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('userEmail');
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload.name).toBe('新しい名前');
    expect(payload.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  it('rejects when the team belongs to another user', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'team-1',
      data: () => ({ ...ownTeamDoc().data(), userId: 'someone-else' }),
    });

    await expect(updateTeam('team-1', { name: 'x' })).rejects.toThrow(
      'このデータを編集する権限がありません'
    );
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('addPlayerToTeam', () => {
  it('appends the player inside a single transaction', async () => {
    await addPlayerToTeam('team-1', {
      name: '佐藤',
      number: '9',
      position: '右',
    });

    expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();

    const payload = mockTransaction.update.mock.calls[0][1];
    expect(payload.players).toHaveLength(3);
    expect(payload.players[2]).toMatchObject({
      name: '佐藤',
      number: '9',
      position: '右',
    });
    expect(payload.players[2].id).toBeDefined();
  });

  it('rejects inside the transaction when the team belongs to another user', async () => {
    mockTransaction.get.mockResolvedValue({
      exists: () => true,
      id: 'team-1',
      data: () => ({ ...ownTeamDoc().data(), userId: 'someone-else' }),
    });

    await expect(
      addPlayerToTeam('team-1', { name: '佐藤', number: '9', position: '右' })
    ).rejects.toThrow('このデータを編集する権限がありません');
    expect(mockTransaction.update).not.toHaveBeenCalled();
  });
});

describe('removePlayerFromTeam', () => {
  it('removes the player inside a single transaction', async () => {
    await removePlayerFromTeam('team-1', 'p1');

    expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();

    const payload = mockTransaction.update.mock.calls[0][1];
    expect(payload.players).toHaveLength(1);
    expect(payload.players[0].id).toBe('p2');
  });
});

describe('updatePlayerInTeam', () => {
  it('merges player data inside a single transaction', async () => {
    await updatePlayerInTeam('team-1', 'p1', { name: '山田太郎' });

    expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();

    const payload = mockTransaction.update.mock.calls[0][1];
    expect(payload.players[0]).toMatchObject({
      id: 'p1',
      name: '山田太郎',
      position: '投',
    });
    expect(payload.players[1].name).toBe('鈴木');
  });
});
