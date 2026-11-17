// Firestore security-rules tests; run through the emulator with `npm run test:rules`.
module.exports = {
  rootDir: '.',
  testEnvironment: '<rootDir>/firestore-rules-tests/node-environment.js',
  testMatch: ['<rootDir>/firestore-rules-tests/**/*.test.js'],
  testTimeout: 30000,
};
