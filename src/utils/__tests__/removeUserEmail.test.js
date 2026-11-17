const {
  parseArgs,
  removeUserEmail,
} = require('../../../scripts/remove-user-email');

// A tiny in-memory stand-in for the Admin SDK: collection().orderBy().startAfter().limit().get().
const fakeDb = (data) => {
  const collections = Object.fromEntries(
    Object.entries(data).map(([name, docs]) => [
      name,
      Object.entries(docs).map(([id, fields]) => ({
        id,
        fields: { ...fields },
      })),
    ])
  );
  const updates = [];
  const commits = [];
  return {
    collections,
    updates,
    commits,
    collection: (name) => {
      let after = null;
      let max = Infinity;
      const query = {
        orderBy: () => query,
        startAfter: (snapshot) => {
          after = snapshot.id;
          return query;
        },
        limit: (n) => {
          max = n;
          return query;
        },
        get: async () => {
          const withField = collections[name]
            .filter((d) => 'userEmail' in d.fields)
            .sort((a, b) => a.id.localeCompare(b.id));
          const start = after
            ? withField.findIndex((d) => d.id === after) + 1
            : 0;
          const docs = withField.slice(start, start + max).map((d) => ({
            id: d.id,
            ref: { name, id: d.id },
          }));
          return { docs, empty: docs.length === 0 };
        },
      };
      return query;
    },
    batch: () => {
      const pending = [];
      return {
        update: (ref, fields) => pending.push({ ref, fields }),
        commit: async () => {
          commits.push(pending.length);
          for (const { ref, fields } of pending) {
            updates.push({ ...ref, fields });
            const doc = collections[ref.name].find((d) => d.id === ref.id);
            if (fields.userEmail === 'DELETE') delete doc.fields.userEmail;
          }
        },
      };
    },
  };
};
const FieldValue = { delete: () => 'DELETE' };
const silent = () => {};

describe('removeUserEmail', () => {
  const sample = () => ({
    games: {
      g1: { userId: 'a', userEmail: 'a@example.com' },
      g2: { userId: 'b' },
      g3: { userId: 'c', userEmail: 'c@example.com' },
    },
    teams: { t1: { userId: 'a', userEmail: 'a@example.com' } },
  });

  test('by default only reports what it would change and writes nothing', async () => {
    const db = fakeDb(sample());
    const result = await removeUserEmail({ db, FieldValue, log: silent });
    expect(result).toEqual({ games: 2, teams: 1 });
    expect(db.updates).toEqual([]);
    expect(db.commits).toEqual([]);
    expect(db.collections.games[0].fields.userEmail).toBe('a@example.com');
  });

  test('with apply it deletes only the userEmail field of the documents that have it', async () => {
    const db = fakeDb(sample());
    const result = await removeUserEmail({
      db,
      FieldValue,
      apply: true,
      log: silent,
    });
    expect(result).toEqual({ games: 2, teams: 1 });
    expect(db.updates.map((u) => `${u.name}/${u.id}`).sort()).toEqual([
      'games/g1',
      'games/g3',
      'teams/t1',
    ]);
    for (const update of db.updates) {
      expect(update.fields).toEqual({ userEmail: 'DELETE' });
    }
    expect(
      Object.values(db.collections)
        .flat()
        .some((d) => 'userEmail' in d.fields)
    ).toBe(false);
    // untouched documents keep their other fields
    expect(db.collections.games[1].fields).toEqual({ userId: 'b' });
  });

  test('commits in batches no larger than the batch size', async () => {
    const many = {
      games: Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [
          `g${i}`,
          { userEmail: 'x@example.com' },
        ])
      ),
      teams: {},
    };
    const db = fakeDb(many);
    await removeUserEmail({
      db,
      FieldValue,
      apply: true,
      batchSize: 2,
      log: silent,
    });
    expect(db.commits).toEqual([2, 2, 1]);
  });

  test('does not print the e-mail addresses it removes', async () => {
    const lines = [];
    await removeUserEmail({
      db: fakeDb(sample()),
      FieldValue,
      apply: true,
      log: (line) => lines.push(line),
    });
    expect(lines.join('\n')).not.toContain('example.com');
  });
});

describe('parseArgs', () => {
  test('requires an explicit project and defaults to a dry run', () => {
    expect(parseArgs(['--project=my-proj'])).toEqual({
      project: 'my-proj',
      apply: false,
    });
    expect(parseArgs(['--project=my-proj', '--apply']).apply).toBe(true);
    expect(() => parseArgs([])).toThrow('--project');
    expect(() => parseArgs(['--apply'])).toThrow('--project');
  });
});
