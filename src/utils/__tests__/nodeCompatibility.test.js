const fs = require('fs');
const path = require('path');
const semver = require('semver');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../../..');

test('the declared Node range respects the Firebase SDK requirement', () => {
  const manifest = require('../../../package.json');
  const firebase = require('@firebase/app/package.json');
  expect(
    semver.subset(manifest.engines?.node || '*', firebase.engines.node)
  ).toBe(true);
});

test('nvm selects an exact supported Node version', () => {
  const manifest = require('../../../package.json');
  const version = fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
  expect(semver.valid(version)).not.toBeNull();
  expect(semver.satisfies(version, manifest.engines.node)).toBe(true);
});

test('all workflow Node selectors support the declared minimum', () => {
  const manifest = require('../../../package.json');
  const supported = manifest.engines?.node;
  expect(supported).toBeDefined();
  const workflowDirectory = path.join(repoRoot, '.github/workflows');
  const versions = [];
  for (const filename of fs.readdirSync(workflowDirectory)) {
    if (!/\.ya?ml$/.test(filename)) continue;
    const workflow = yaml.load(
      fs.readFileSync(path.join(workflowDirectory, filename), 'utf8')
    );
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps || []) {
        if (!step.uses?.startsWith('actions/setup-node@')) continue;
        const version = step.with['node-version'];
        const selectors = String(version).includes('${{')
          ? job.strategy.matrix['node-version']
          : [version];
        versions.push(...selectors.map(String));
      }
    }
  }
  expect(versions.length).toBeGreaterThan(0);
  for (const version of versions) {
    expect(semver.intersects(version, supported)).toBe(true);
  }
  expect(versions).toContain(semver.minVersion(supported).version);
});
