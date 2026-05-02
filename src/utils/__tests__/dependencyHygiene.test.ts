import fs from 'fs';
import path from 'path';

type PackageJson = {
  devDependencies?: Record<string, string>;
};

const repoRoot = path.resolve(__dirname, '../../..');
const packageJsonPath = path.join(repoRoot, 'package.json');

const readPackageJson = (): PackageJson =>
  JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;

describe('dependency hygiene policy', () => {
  it.each(['eslint-plugin-jest', 'jest-environment-jsdom'])(
    'does not keep unused direct dev dependency %s',
    (dependencyName) => {
      const packageJson = readPackageJson();

      expect(packageJson.devDependencies?.[dependencyName]).toBeUndefined();
    }
  );
});
