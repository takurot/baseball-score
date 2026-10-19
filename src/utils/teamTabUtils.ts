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
  if (!trimmed) {
    return role;
  }
  if (
    trimmed === role ||
    trimmed === `${role}チーム` ||
    trimmed === '先攻チーム' ||
    trimmed === '後攻チーム' ||
    trimmed === '先攻' ||
    trimmed === '後攻'
  ) {
    return role;
  }
  return `${role}（${trimmed}）`;
}
