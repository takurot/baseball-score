const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} = require('firebase/firestore');
const { setup } = require('./helpers');

let env;
beforeAll(async () => {
  env = await setup();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'games/public1'), { userId: 'alice', isPublic: true });
    await setDoc(doc(db, 'games/private1'), {
      userId: 'alice',
      isPublic: false,
    });
    await setDoc(doc(db, 'games/bobPublic'), { userId: 'bob', isPublic: true });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const asUser = (uid) => env.authenticatedContext(uid).firestore();

describe('games: public read is get-only', () => {
  test('anyone can get a single public game by id', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'games/public1')));
  });

  test('anyone can not get a private game', async () => {
    await assertFails(getDoc(doc(anon(), 'games/private1')));
  });

  test('an unauthenticated list of public games is denied', async () => {
    await assertFails(
      getDocs(query(collection(anon(), 'games'), where('isPublic', '==', true)))
    );
  });

  test('a signed-in user can not list other users public games', async () => {
    await assertFails(
      getDocs(
        query(
          collection(asUser('carol'), 'games'),
          where('isPublic', '==', true)
        )
      )
    );
  });
});

describe('games: owners keep full read access', () => {
  test('the owner can list their own games', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(asUser('alice'), 'games'),
          where('userId', '==', 'alice')
        )
      )
    );
  });

  test('the owner can get a private game', async () => {
    await assertSucceeds(getDoc(doc(asUser('alice'), 'games/private1')));
  });

  test('another user can not get a private game', async () => {
    await assertFails(getDoc(doc(asUser('bob'), 'games/private1')));
  });

  test('the owner can still get their own public game', async () => {
    await assertSucceeds(getDoc(doc(asUser('alice'), 'games/public1')));
  });
});
