import fs from 'fs';
import path from 'path';

type PackageLock = {
  packages?: Record<string, { version?: string }>;
};

const repoRoot = path.resolve(__dirname, '../../..');
const packageLockPath = path.join(repoRoot, 'package-lock.json');

const readPackageLock = (): PackageLock =>
  JSON.parse(fs.readFileSync(packageLockPath, 'utf8')) as PackageLock;

const getInstalledVersion = (
  packageLock: PackageLock,
  packagePath: string
): string => {
  const version = packageLock.packages?.[packagePath]?.version;
  if (!version) {
    throw new Error(`Package not found in lockfile: ${packagePath}`);
  }

  return version;
};

const parseVersion = (version: string): [number, number, number] => {
  const normalized = version.replace(/^[^\d]*/, '').split('.');
  return [
    Number.parseInt(normalized[0] ?? '0', 10),
    Number.parseInt(normalized[1] ?? '0', 10),
    Number.parseInt(normalized[2] ?? '0', 10),
  ];
};

const isGte = (actual: string, minimum: string): boolean => {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);

  for (let index = 0; index < 3; index += 1) {
    if (actualParts[index] > minimumParts[index]) {
      return true;
    }

    if (actualParts[index] < minimumParts[index]) {
      return false;
    }
  }

  return true;
};

describe('dependency overrides policy', () => {
  it.each([
    ['node_modules/lodash', '4.18.1'],
    ['node_modules/node-forge', '1.4.0'],
    ['node_modules/flatted', '3.4.2'],
    ['node_modules/path-to-regexp', '0.1.13'],
    ['node_modules/postcss-svgo/node_modules/svgo', '2.8.1'],
    ['node_modules/postcss-load-config/node_modules/yaml', '2.8.3'],
    ['node_modules/yaml', '1.10.3'],
  ])('keeps %s at or above %s', (packagePath, minimumVersion) => {
    const packageLock = readPackageLock();
    const installedVersion = getInstalledVersion(packageLock, packagePath);

    expect(isGte(installedVersion, minimumVersion)).toBe(true);
  });
});
