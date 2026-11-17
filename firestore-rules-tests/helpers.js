const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

// FIRESTORE_EMULATOR_HOST is provided by `firebase emulators:exec`.
const setup = () =>
  initializeTestEnvironment({
    projectId: 'demo-rules',
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, '..', 'firestore.rules'),
        'utf8'
      ),
    },
  });

module.exports = { setup };
