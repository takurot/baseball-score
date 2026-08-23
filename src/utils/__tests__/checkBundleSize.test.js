const {
  parseMaxSizeMB,
  filterJsFiles,
  findMainBundle,
  getFileSizeSafe,
} = require('../../../scripts/check-bundle-size');

describe('check-bundle-size', () => {
  describe('parseMaxSizeMB', () => {
    it('returns the default (1) when unset', () => {
      expect(parseMaxSizeMB(undefined)).toBe(1);
      expect(parseMaxSizeMB('')).toBe(1);
    });

    it('returns the parsed number for a valid positive value', () => {
      expect(parseMaxSizeMB('2')).toBe(2);
      expect(parseMaxSizeMB('0.5')).toBe(0.5);
    });

    it('throws a clear error for a non-numeric value (would silently pass otherwise)', () => {
      expect(() => parseMaxSizeMB('abc')).toThrow('Invalid MAX_BUNDLE_SIZE_MB');
    });

    it('throws a clear error for zero', () => {
      expect(() => parseMaxSizeMB('0')).toThrow('Invalid MAX_BUNDLE_SIZE_MB');
    });

    it('throws a clear error for a negative value', () => {
      expect(() => parseMaxSizeMB('-5')).toThrow('Invalid MAX_BUNDLE_SIZE_MB');
    });
  });

  describe('filterJsFiles', () => {
    it('keeps only .js files', () => {
      const files = [
        'main.abc123.js',
        'main.abc123.js.map',
        '229.def456.chunk.js',
        'asset-manifest.json',
      ];
      expect(filterJsFiles(files)).toEqual([
        'main.abc123.js',
        '229.def456.chunk.js',
      ]);
    });

    it('does not exclude filenames that merely contain "map" (previous bug)', () => {
      const files = ['map-utils.abc123.chunk.js', 'main.def456.js'];
      expect(filterJsFiles(files)).toEqual(files);
    });
  });

  describe('findMainBundle', () => {
    it('finds the single main.* candidate', () => {
      const files = ['main.abc123.js', '229.def456.chunk.js'];
      const { mainBundle, candidates } = findMainBundle(files);
      expect(mainBundle).toBe('main.abc123.js');
      expect(candidates).toEqual(['main.abc123.js']);
    });

    it('returns null when there is no main.* file', () => {
      const files = ['229.def456.chunk.js'];
      const { mainBundle, candidates } = findMainBundle(files);
      expect(mainBundle).toBeNull();
      expect(candidates).toEqual([]);
    });

    it('surfaces all candidates when more than one main.* file exists', () => {
      const files = ['main.abc123.js', 'main.old456.js'];
      const { mainBundle, candidates } = findMainBundle(files);
      expect(mainBundle).toBe('main.abc123.js');
      expect(candidates).toEqual(['main.abc123.js', 'main.old456.js']);
    });
  });

  describe('getFileSizeSafe', () => {
    it('returns null instead of throwing when the file cannot be read', () => {
      expect(getFileSizeSafe('/nonexistent/path/does-not-exist.js')).toBeNull();
    });

    it('returns the size for a real file', () => {
      const size = getFileSizeSafe(__filename);
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });
  });
});
