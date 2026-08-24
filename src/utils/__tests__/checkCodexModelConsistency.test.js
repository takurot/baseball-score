const {
  extractModel,
  validateAgentModels,
} = require('../../../scripts/check-codex-model-consistency');

describe('check-codex-model-consistency', () => {
  describe('extractModel', () => {
    it('extracts the model slug from a model = "..." line', () => {
      const toml = 'model = "gpt-5.4"\nmodel_reasoning_effort = "high"\n';
      expect(extractModel(toml)).toBe('gpt-5.4');
    });

    it('returns null when there is no model line', () => {
      expect(extractModel('sandbox_mode = "read-only"\n')).toBeNull();
    });
  });

  describe('validateAgentModels', () => {
    it('reports no problems when all models match', () => {
      const entries = [
        { file: 'a.toml', model: 'gpt-5.4' },
        { file: 'b.toml', model: 'gpt-5.4' },
      ];
      expect(validateAgentModels(entries)).toEqual([]);
    });

    it('reports a problem when models diverge across files', () => {
      const entries = [
        { file: 'a.toml', model: 'gpt-5.4' },
        { file: 'b.toml', model: 'gpt-5.3' },
      ];
      const problems = validateAgentModels(entries);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('a.toml=gpt-5.4');
      expect(problems[0]).toContain('b.toml=gpt-5.3');
    });

    it('reports a problem when a file has no model line at all', () => {
      const entries = [{ file: 'a.toml', model: null }];
      const problems = validateAgentModels(entries);
      expect(problems).toEqual(['a.toml: no "model = ..." line found']);
    });
  });
});
