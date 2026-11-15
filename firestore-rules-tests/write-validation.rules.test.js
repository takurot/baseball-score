const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} = require('firebase/firestore');
const { setup } = require('./helpers');

let env;
beforeAll(async () => {
  env = await setup();
});
afterAll(async () => {
  await env.cleanup();
});

const CREATED = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
const asUser = (uid) => env.authenticatedContext(uid).firestore();

const team = (name) => ({ id: name, name, players: [], atBats: [] });
// The shape written by gameService.buildGameToSave.
const newGame = (overrides = {}) => ({
  id: '',
  date: '2026-04-01',
  currentInning: 1,
  homeTeam: team('home'),
  awayTeam: team('away'),
  gameType: 'practice',
  userId: 'alice',
  isPublic: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});
// The shape written by teamService.createTeam.
const newTeam = (overrides = {}) => ({
  name: 'チーム',
  players: [{ id: 'p1', name: '山田', number: '1', position: '投' }],
  userId: 'alice',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'games/g1'), {
      ...newGame({ createdAt: CREATED, updatedAt: CREATED }),
      userEmail: 'legacy@example.com',
      legacyField: 'kept', // older documents may carry fields that are no longer in the type
    });
    await setDoc(doc(db, 'teams/t1'), {
      ...newTeam({ createdAt: CREATED, updatedAt: CREATED }),
      userEmail: 'legacy@example.com',
    });
  });
});

describe('games: create', () => {
  test('accepts the payload the app writes', async () => {
    await assertSucceeds(
      addDoc(collection(asUser('alice'), 'games'), newGame())
    );
  });

  test('rejects a userId that is not the signed-in user', async () => {
    await assertFails(
      addDoc(collection(asUser('alice'), 'games'), newGame({ userId: 'bob' }))
    );
  });

  test('rejects any userEmail, so nobody can attach someone elses address', async () => {
    await assertFails(
      addDoc(
        collection(asUser('alice'), 'games'),
        newGame({ userEmail: 'victim@example.com' })
      )
    );
  });

  test('rejects an isPublic that is not a boolean', async () => {
    await assertFails(
      addDoc(collection(asUser('alice'), 'games'), newGame({ isPublic: 'yes' }))
    );
  });

  test('rejects keys the app never writes', async () => {
    await assertFails(
      addDoc(collection(asUser('alice'), 'games'), newGame({ extra: 'x' }))
    );
  });

  test('rejects wrongly typed core fields', async () => {
    const games = collection(asUser('alice'), 'games');
    await assertFails(addDoc(games, newGame({ date: 20260401 })));
    await assertFails(addDoc(games, newGame({ currentInning: 'one' })));
    await assertFails(addDoc(games, newGame({ homeTeam: 'home' })));
  });

  test('rejects an unauthenticated create', async () => {
    await assertFails(
      addDoc(
        collection(env.unauthenticatedContext().firestore(), 'games'),
        newGame()
      )
    );
  });
});

describe('games: update', () => {
  const g1 = (uid = 'alice') => doc(asUser(uid), 'games/g1');

  test('lets the owner make an ordinary update, even on a document with legacy fields', async () => {
    await assertSucceeds(
      updateDoc(g1(), { currentInning: 2, updatedAt: serverTimestamp() })
    );
  });

  test('forbids changing userId', async () => {
    await assertFails(updateDoc(g1(), { userId: 'bob' }));
  });

  test('forbids changing createdAt', async () => {
    await assertFails(
      updateDoc(g1(), {
        createdAt: Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
      })
    );
  });

  test('forbids setting a new userEmail but allows removing it', async () => {
    await assertFails(updateDoc(g1(), { userEmail: 'victim@example.com' }));
    await assertSucceeds(updateDoc(g1(), { userEmail: deleteField() }));
  });

  test('forbids a non-boolean isPublic', async () => {
    await assertFails(updateDoc(g1(), { isPublic: 'yes' }));
    await assertSucceeds(updateDoc(g1(), { isPublic: true }));
  });

  test('forbids another user from updating or deleting', async () => {
    await assertFails(updateDoc(g1('bob'), { currentInning: 3 }));
    await assertFails(deleteDoc(g1('bob')));
  });

  test('lets the owner delete', async () => {
    await assertSucceeds(deleteDoc(g1()));
  });
});

describe('teams: create and update', () => {
  const t1 = (uid = 'alice') => doc(asUser(uid), 'teams/t1');

  test('accepts the payload the app writes', async () => {
    await assertSucceeds(
      addDoc(collection(asUser('alice'), 'teams'), newTeam())
    );
  });

  test('rejects a foreign userId, any userEmail, unknown keys and wrong types on create', async () => {
    const teams = collection(asUser('alice'), 'teams');
    await assertFails(addDoc(teams, newTeam({ userId: 'bob' })));
    await assertFails(
      addDoc(teams, newTeam({ userEmail: 'victim@example.com' }))
    );
    await assertFails(addDoc(teams, newTeam({ extra: 'x' })));
    await assertFails(addDoc(teams, newTeam({ name: 123 })));
    await assertFails(addDoc(teams, newTeam({ players: 'none' })));
  });

  test('keeps userId and createdAt fixed on update', async () => {
    await assertSucceeds(
      updateDoc(t1(), { name: '新しい名前', updatedAt: serverTimestamp() })
    );
    await assertFails(updateDoc(t1(), { userId: 'bob' }));
    await assertFails(
      updateDoc(t1(), {
        createdAt: Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
      })
    );
  });

  test('forbids setting a new userEmail but allows removing it', async () => {
    await assertFails(updateDoc(t1(), { userEmail: 'victim@example.com' }));
    await assertSucceeds(updateDoc(t1(), { userEmail: deleteField() }));
  });

  test('forbids another user from updating', async () => {
    await assertFails(updateDoc(t1('bob'), { name: 'x' }));
  });
});
