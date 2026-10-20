export type TeamRole = '先攻' | '後攻';
export const AWAY_ROLE: TeamRole = '先攻';
export const HOME_ROLE: TeamRole = '後攻';

export const DEFAULT_AWAY_TEAM_NAME = '先攻チーム';
export const DEFAULT_HOME_TEAM_NAME = '後攻チーム';

const DEFAULT_TEAM_NAMES: readonly string[] = [
  AWAY_ROLE,
  HOME_ROLE,
  DEFAULT_AWAY_TEAM_NAME,
  DEFAULT_HOME_TEAM_NAME,
];

export function resolveRole(role: TeamRole | 'away' | 'home'): TeamRole {
  if (role === 'away') return AWAY_ROLE;
  if (role === 'home') return HOME_ROLE;
  return role;
}

/**
 * チームの表示用名称を取得する（空の場合はデフォルト名）
 */
export function getDisplayTeamName(
  teamName: string | undefined | null,
  role: TeamRole | 'away' | 'home'
): string {
  const resolvedRole = resolveRole(role);
  const trimmed = teamName?.trim();
  if (trimmed) {
    return trimmed;
  }
  return resolvedRole === AWAY_ROLE
    ? DEFAULT_AWAY_TEAM_NAME
    : DEFAULT_HOME_TEAM_NAME;
}

/**
 * チーム選択タブの表示ラベルを生成する
 *
 * @param teamName チーム名
 * @param role '先攻' | '後攻' | 'away' | 'home'
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
  role: TeamRole | 'away' | 'home'
): string {
  const resolvedRole = resolveRole(role);
  const trimmed = teamName?.trim();
  if (!trimmed || DEFAULT_TEAM_NAMES.includes(trimmed)) {
    return resolvedRole;
  }
  return `${resolvedRole}（${trimmed}）`;
}
