export const DEFAULT_AWAY_TEAM_NAME = '先攻チーム';
export const DEFAULT_HOME_TEAM_NAME = '後攻チーム';

const DEFAULT_TEAM_NAMES: readonly string[] = [
  '先攻',
  '後攻',
  DEFAULT_AWAY_TEAM_NAME,
  DEFAULT_HOME_TEAM_NAME,
];

/**
 * チームの表示用名称を取得する（空の場合はデフォルト名）
 */
export function getDisplayTeamName(
  teamName: string | undefined | null,
  role: '先攻' | '後攻'
): string {
  const trimmed = teamName?.trim();
  if (trimmed) {
    return trimmed;
  }
  return role === '先攻' ? DEFAULT_AWAY_TEAM_NAME : DEFAULT_HOME_TEAM_NAME;
}

/**
 * チーム選択タブの表示ラベルを生成する
 *
 * @param teamName チーム名
 * @param role '先攻' | '後攻'
 * @returns タブに表示するラベル文字列
 *
 * - チーム名が未設定（undefined, null, 空文字, 空白のみ）の場合:
 *   -> '先攻' または '後攻'
 * - チーム名がデフォルト名（'先攻チーム', '後攻チーム', '先攻', '後攻'）の場合:
 *   -> '先攻' または '後攻'（二重表記を防ぐため）
 * - チーム名が具体的に設定されている場合（例: '豊郷中央'）:
 *   -> '先攻（豊郷中央）' または '後攻（相手チーム）'
 */
export function getTeamTabLabel(
  teamName: string | undefined | null,
  role: '先攻' | '後攻'
): string {
  const trimmed = teamName?.trim();
  if (!trimmed || DEFAULT_TEAM_NAMES.includes(trimmed)) {
    return role;
  }
  return `${role}（${trimmed}）`;
}
