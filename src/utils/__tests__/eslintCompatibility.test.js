const fs = require('fs');
const path = require('path');
const semver = require('semver');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../../..');

test('the project ESLint range stays within the CRA-supported major', () => {
  const manifest = require('../../../package.json');
  const reactAppConfig = require('eslint-config-react-app/package.json');
  const range = manifest.devDependencies.eslint;
  expect(semver.subset(range, reactAppConfig.peerDependencies.eslint)).toBe(
    true
  );
});

test('Dependabot defers incompatible ESLint majors without blocking patches', () => {
  const config = yaml.load(
    fs.readFileSync(path.join(repoRoot, '.github/dependabot.yml'), 'utf8')
  );
  const npm = config.updates.find(
    (update) => update['package-ecosystem'] === 'npm'
  );
  expect(npm.ignore).toContainEqual({
    'dependency-name': 'eslint',
    'update-types': ['version-update:semver-major'],
  });
});
