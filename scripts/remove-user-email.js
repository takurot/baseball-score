#!/usr/bin/env node
/**
 * One-off migration: remove the legacy `userEmail` field from `games` and `teams`.
 *
 * The app no longer writes `userEmail` (it leaked the owner's address on public
 * games). Documents saved earlier still carry it. This script deletes the field.
 *
 *   npm i --no-save firebase-admin
 *   # Application Default Credentials with write access to the project:
 *   #   gcloud auth application-default login
 *   node scripts/remove-user-email.js --project=<project-id>           # dry run (default)
 *   node scripts/remove-user-email.js --project=<project-id> --apply   # writes
 *
 * It never prints the addresses themselves, only counts.
 */
const COLLECTIONS = ['games', 'teams'];
const DEFAULT_BATCH_SIZE = 400; // below Firestore's 500 writes per batch

function parseArgs(args = process.argv.slice(2)) {
  const projectArg = args.find((arg) => arg.startsWith('--project='));
  const project = projectArg ? projectArg.slice('--project='.length) : '';
  if (!project) {
    throw new Error(
      '--project=<project-id> is required (the target is never guessed)'
    );
  }
  return { project, apply: args.includes('--apply') };
}

async function removeUserEmail({
  db,
  FieldValue,
  apply = false,
  batchSize = DEFAULT_BATCH_SIZE,
  log = console.log,
}) {
  const result = {};
  for (const name of COLLECTIONS) {
    let count = 0;
    let last = null;
    for (;;) {
      // orderBy on the field only returns documents that have it.
      let query = db.collection(name).orderBy('userEmail');
      if (last) query = query.startAfter(last);
      const snapshot = await query.limit(batchSize).get();
      if (snapshot.empty) break;
      if (apply) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) =>
          batch.update(doc.ref, { userEmail: FieldValue.delete() })
        );
        await batch.commit();
      }
      count += snapshot.docs.length;
      last = snapshot.docs[snapshot.docs.length - 1];
      log(`${name}: ${count} document(s) ${apply ? 'updated' : 'to update'}`);
    }
    result[name] = count;
  }
  log(apply ? 'Done.' : 'Dry run only. Re-run with --apply to write.');
  return result;
}

async function main() {
  const { project, apply } = parseArgs();
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    throw new Error(
      'firebase-admin is not installed: npm i --no-save firebase-admin'
    );
  }
  admin.initializeApp({ projectId: project });
  await removeUserEmail({
    db: admin.firestore(),
    FieldValue: admin.firestore.FieldValue,
    apply,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, removeUserEmail };
