import fs from 'fs';
import path from 'path';

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const repoRoot = path.resolve(__dirname, '../../..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const jestConfigPath = path.join(repoRoot, 'jest.config.js');

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

  it('declares eslint as a direct devDependency', () => {
    const packageJson = readPackageJson();
    expect(packageJson.devDependencies?.eslint).toBeDefined();
  });

  it.each([
    '@testing-library/dom',
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@testing-library/user-event',
    '@types/jest',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'typescript',
  ])('places %s in devDependencies rather than dependencies', (depName) => {
    const packageJson = readPackageJson();
    expect(packageJson.dependencies?.[depName]).toBeUndefined();
    expect(packageJson.devDependencies?.[depName]).toBeDefined();
  });

  it('does not contain dead jest.config.js in repo root', () => {
    expect(fs.existsSync(jestConfigPath)).toBe(false);
  });

  it('does not have build:noeslint bypass script in package.json', () => {
    const packageJson = readPackageJson();
    expect(packageJson.scripts?.['build:noeslint']).toBeUndefined();
  });
});
