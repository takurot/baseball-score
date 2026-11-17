import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getCurrentUser } from '../authService';
import {
  ReauthRequiredError,
  deleteAccount,
  getReauthMethod,
} from '../accountService';

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  deleteUser: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  reauthenticateWithPopup: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
}));
jest.mock('../config', () => ({ db: {} }));
jest.mock('../authService', () => ({ getCurrentUser: jest.fn() }));

const NOW = new Date('2026-11-15T12:00:00Z').getTime();
const recent = new Date(NOW - 60 * 1000).toUTCString();
const old = new Date(NOW - 60 * 60 * 1000).toUTCString();

const userWith = (providerId: string, lastSignInTime: string) => ({
  uid: 'u1',
  email: 'me@example.com',
  metadata: { lastSignInTime },
  providerData: [{ providerId }],
});

const snapshot = (...ids: string[]) => ({
  empty: ids.length === 0,
  docs: ids.map((id) => ({ ref: { id }, id })),
});

const calls: string[] = [];
const batchDeletes: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  // react-scripts は resetMocks: true のため、実装は毎回ここで設定する
  (collection as jest.Mock).mockImplementation((_db, name) => ({ name }));
  (query as jest.Mock).mockImplementation((source, ...clauses) => ({
    source,
    clauses,
  }));
  (where as jest.Mock).mockImplementation((field, op, value) => ({
    field,
    op,
    value,
  }));
  (limit as jest.Mock).mockImplementation((n) => ({ limit: n }));
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  calls.length = 0;
  batchDeletes.length = 0;
  (writeBatch as jest.Mock).mockImplementation(() => ({
    delete: (ref: { id: string }) => batchDeletes.push(ref.id),
    commit: async () => {
      calls.push('commit');
    },
  }));
  (deleteUser as jest.Mock).mockImplementation(async () => {
    calls.push('deleteUser');
  });
  (reauthenticateWithPopup as jest.Mock).mockImplementation(async () => {
    calls.push('reauth');
  });
  (reauthenticateWithCredential as jest.Mock).mockImplementation(async () => {
    calls.push('reauth');
  });
  (EmailAuthProvider.credential as jest.Mock).mockReturnValue('CREDENTIAL');
});

afterEach(() => jest.restoreAllMocks());

// getDocs is called per collection page: games (2 docs, then empty), teams (1 doc, then empty)
const stubData = () =>
  (getDocs as jest.Mock)
    .mockResolvedValueOnce(snapshot('g1', 'g2'))
    .mockResolvedValueOnce(snapshot())
    .mockResolvedValueOnce(snapshot('t1'))
    .mockResolvedValueOnce(snapshot());

describe('getReauthMethod', () => {
  it('tells Google and password accounts apart', () => {
    expect(getReauthMethod(userWith('google.com', recent) as never)).toBe(
      'google'
    );
    expect(getReauthMethod(userWith('password', recent) as never)).toBe(
      'password'
    );
    expect(getReauthMethod(userWith('github.com', recent) as never)).toBe(
      'unknown'
    );
  });
});

describe('deleteAccount', () => {
  it('requires a signed-in user', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    await expect(deleteAccount()).rejects.toThrow('ログイン');
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('re-authenticates first even after a very recent sign-in, then deletes the data, then the account', async () => {
    // the sign-in time of *this* session cannot be judged reliably on the client
    // (another device, clock skew, a slow deletion), so the identity is always re-checked
    (getCurrentUser as jest.Mock).mockReturnValue(
      userWith('google.com', recent)
    );
    stubData();

    await deleteAccount();

    expect(batchDeletes).toEqual(['g1', 'g2', 't1']);
    expect(calls).toEqual(['reauth', 'commit', 'commit', 'deleteUser']);
  });

  it('queries only the signed-in users own documents, in games and teams', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(
      userWith('google.com', recent)
    );
    stubData();

    await deleteAccount();

    const queries = (getDocs as jest.Mock).mock.calls.map(([q]) => q);
    expect(queries.map((q) => q.source.name)).toEqual([
      'games',
      'games',
      'teams',
      'teams',
    ]);
    for (const q of queries) {
      expect(q.clauses).toContainEqual({
        field: 'userId',
        op: '==',
        value: 'u1',
      });
    }
  });

  it('asks a password account for its password, and deletes nothing without it', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(userWith('password', old));

    await expect(deleteAccount()).rejects.toBeInstanceOf(ReauthRequiredError);
    expect(getDocs).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('re-authenticates a password account with the given password', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(userWith('password', old));
    stubData();

    await deleteAccount({ password: 'secret' });

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      'me@example.com',
      'secret'
    );
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(
      expect.anything(),
      'CREDENTIAL'
    );
    expect(calls).toEqual(['reauth', 'commit', 'commit', 'deleteUser']);
  });

  it('deletes nothing when re-authentication fails', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(userWith('password', old));
    (reauthenticateWithCredential as jest.Mock).mockRejectedValue({
      code: 'auth/invalid-credential',
    });

    await expect(deleteAccount({ password: 'wrong' })).rejects.toEqual({
      code: 'auth/invalid-credential',
    });
    expect(getDocs).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('keeps the Auth account when deleting the data fails', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(
      userWith('google.com', recent)
    );
    (getDocs as jest.Mock).mockRejectedValue(new Error('permission-denied'));

    await expect(deleteAccount()).rejects.toThrow('permission-denied');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('pages through more documents than one batch holds', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(
      userWith('google.com', recent)
    );
    (getDocs as jest.Mock)
      .mockResolvedValueOnce(snapshot('g1'))
      .mockResolvedValueOnce(snapshot('g2'))
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValueOnce(snapshot());

    await deleteAccount();

    expect(batchDeletes).toEqual(['g1', 'g2']);
    expect(calls).toEqual(['reauth', 'commit', 'commit', 'deleteUser']);
  });
});
