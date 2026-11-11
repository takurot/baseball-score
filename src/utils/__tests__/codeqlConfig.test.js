const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../../..');

test('all CodeQL steps use the same immutable revision', () => {
  const workflowDirectory = path.join(repoRoot, '.github/workflows');
  const revisions = [];
  for (const filename of fs.readdirSync(workflowDirectory)) {
    if (!/\.ya?ml$/.test(filename)) continue;
    const workflow = yaml.load(
      fs.readFileSync(path.join(workflowDirectory, filename), 'utf8')
    );
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps || []) {
        const match = step.uses?.match(/^github\/codeql-action\/[^@]+@(.+)$/);
        if (match) revisions.push(match[1]);
      }
    }
  }
  expect(revisions.length).toBeGreaterThan(0);
  expect(new Set(revisions).size).toBe(1);
  expect(revisions[0]).toMatch(/^[a-f0-9]{40}$/);
});

test('Dependabot updates CodeQL steps together', () => {
  const config = yaml.load(
    fs.readFileSync(path.join(repoRoot, '.github/dependabot.yml'), 'utf8')
  );
  const actions = config.updates.find(
    (update) => update['package-ecosystem'] === 'github-actions'
  );
  expect(Object.values(actions.groups || {})).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ patterns: ['github/codeql-action/*'] }),
    ])
  );
});
