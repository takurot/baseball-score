import {
  getTeamTabLabel,
  getDisplayTeamName,
  DEFAULT_AWAY_TEAM_NAME,
  DEFAULT_HOME_TEAM_NAME,
} from '../teamTabUtils';

describe('teamTabUtils', () => {
  describe('getDisplayTeamName', () => {
    it('チーム名が未設定（undefined, null, 空文字, 空白のみ）の場合はデフォルトチーム名を返す', () => {
      expect(getDisplayTeamName(undefined, '先攻')).toBe(
        DEFAULT_AWAY_TEAM_NAME
      );
      expect(getDisplayTeamName(null, '後攻')).toBe(DEFAULT_HOME_TEAM_NAME);
      expect(getDisplayTeamName('', '先攻')).toBe(DEFAULT_AWAY_TEAM_NAME);
      expect(getDisplayTeamName('   ', '後攻')).toBe(DEFAULT_HOME_TEAM_NAME);
    });

    it('チーム名が設定されている場合はトリムされたチーム名を返す', () => {
      expect(getDisplayTeamName('豊郷中央', '先攻')).toBe('豊郷中央');
      expect(getDisplayTeamName(' ライオンズ ', '後攻')).toBe('ライオンズ');
    });
  });

  describe('getTeamTabLabel', () => {
    describe('先攻タブのラベル生成', () => {
      it('チーム名が未設定（undefined, null, 空文字, 空白のみ）の場合は「先攻」を返す', () => {
        expect(getTeamTabLabel(undefined, '先攻')).toBe('先攻');
        expect(getTeamTabLabel(null, '先攻')).toBe('先攻');
        expect(getTeamTabLabel('', '先攻')).toBe('先攻');
        expect(getTeamTabLabel('   ', '先攻')).toBe('先攻');
      });

      it('デフォルトのチーム名（先攻チーム、先攻）の場合は重複を避けて「先攻」を返す', () => {
        expect(getTeamTabLabel('先攻', '先攻')).toBe('先攻');
        expect(getTeamTabLabel(DEFAULT_AWAY_TEAM_NAME, '先攻')).toBe('先攻');
        expect(getTeamTabLabel(DEFAULT_HOME_TEAM_NAME, '先攻')).toBe('先攻');
      });

      it('チーム名が設定されている場合は「先攻（チーム名）」を返す', () => {
        expect(getTeamTabLabel('豊郷中央', '先攻')).toBe('先攻（豊郷中央）');
        expect(getTeamTabLabel(' 豊郷中央 ', '先攻')).toBe('先攻（豊郷中央）');
      });
    });

    describe('後攻タブのラベル生成', () => {
      it('チーム名が未設定（undefined, null, 空文字, 空白のみ）の場合は「後攻」を返す', () => {
        expect(getTeamTabLabel(undefined, '後攻')).toBe('後攻');
        expect(getTeamTabLabel(null, '後攻')).toBe('後攻');
        expect(getTeamTabLabel('', '後攻')).toBe('後攻');
        expect(getTeamTabLabel('   ', '後攻')).toBe('後攻');
      });

      it('デフォルトのチーム名（後攻チーム、後攻）の場合は重複を避けて「後攻」を返す', () => {
        expect(getTeamTabLabel('後攻', '後攻')).toBe('後攻');
        expect(getTeamTabLabel(DEFAULT_HOME_TEAM_NAME, '後攻')).toBe('後攻');
        expect(getTeamTabLabel(DEFAULT_AWAY_TEAM_NAME, '後攻')).toBe('後攻');
      });

      it('チーム名が設定されている場合は「後攻（チーム名）」を返す', () => {
        expect(getTeamTabLabel('ライオンズ', '後攻')).toBe(
          '後攻（ライオンズ）'
        );
        expect(getTeamTabLabel(' ライオンズ ', '後攻')).toBe(
          '後攻（ライオンズ）'
        );
      });
    });
  });
});
