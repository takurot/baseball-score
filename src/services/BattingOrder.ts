import { Team } from '../types';

/**
 * 打順に基づき、次に打席へ立つ選手の ID を返す。
 *
 * 出場中（isActive）かつ打順が設定されている（order > 0）選手のみを対象とし、
 * これまでに記録された打席数を打順の人数で割った余りから次打者を求める。
 * 打順はイニングをまたいで継続するという実際の野球のルールに準拠する。
 *
 * @param team 対象チーム（players と atBats を含む）
 * @returns 次打者の選手ID。打順が設定された出場選手がいない場合は null
 */
export function getNextBatterPlayerId(team: Team): string | null {
  const battingOrder = [...team.players]
    .filter((player) => player.isActive && player.order > 0)
    .sort((a, b) => a.order - b.order);

  if (battingOrder.length === 0) {
    return null;
  }

  const completedAtBats = team.atBats.length;
  const nextIndex = completedAtBats % battingOrder.length;
  return battingOrder[nextIndex].id;
}
