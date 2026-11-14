import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './config';
import { Game, Team, AtBat, Player, TeamSetting } from '../types';
import { getCurrentUser } from './authService';
import { getUserTeams } from './teamService';
import { getTeamPlayers } from '../services/TeamRoster';
import { BattingStats, ScoreCalculator } from '../services/ScoreCalculator';
import {
  GameTypeFilter,
  meetsQualification,
  matchesGameTypeFilter,
} from '../utils/gameType';

export type { GameTypeFilter };

// チームの通算成績インターフェース
export interface TeamStats {
  teamId: string;
  teamName: string;
  gameCount: number;
  wins: number;
  losses: number;
  draws: number;
  totalRuns: number;
  totalRunsAllowed: number;
  battingStats: BattingStats;
  playerStats: PlayerBattingStats[]; // 選手ごとの打撃成績を追加
}

// 選手の打撃成績インターフェース
export interface PlayerBattingStats extends BattingStats {
  playerId: string;
  playerName: string;
  playerNumber: string;
  playerPosition: string;
  gameCount: number;
  plateAppearances: number;
}

// ゲームコレクションの定数
const GAMES_COLLECTION = 'games';

export const getTeamReportInput = async (
  userId: string,
  teamId: string
): Promise<{ games: Game[]; team: TeamSetting }> => {
  if (getCurrentUser()?.uid !== userId) {
    throw new Error('ログイン状態が変更されました');
  }
  const q = query(
    collection(db, GAMES_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const [teams, snapshot] = await Promise.all([getUserTeams(), getDocs(q)]);
  if (getCurrentUser()?.uid !== userId) {
    throw new Error('ログイン状態が変更されました');
  }
  const team = teams.find(
    (item) => item.id === teamId && item.userId === userId
  );
  if (!team) throw new Error('対象の登録チームが見つかりません');
  return {
    team,
    games: snapshot.docs.map((doc) => ({
      ...(doc.data() as Game),
      id: doc.id,
    })),
  };
};

export interface TeamStatsSnapshot {
  games: Game[];
  teamStats: TeamStats[];
}

// The stats table and trend charts derive from these same fetched games.
export const getTeamStatsSnapshot = async (
  gameTypeFilter: GameTypeFilter = 'all'
): Promise<TeamStatsSnapshot> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('ログインが必要です');
    }

    // ユーザーの全ゲームデータを取得
    const q = query(
      collection(db, GAMES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const [registeredTeams, querySnapshot] = await Promise.all([
      getUserTeams(),
      getDocs(q),
    ]);
    const games = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Game;
      return { ...data, id: doc.id };
    });
    return {
      games,
      teamStats: aggregateTeamStats(
        games,
        registeredTeams.map((team) => team.id),
        gameTypeFilter
      ),
    };
  } catch (error) {
    console.error('Error getting team stats:', error);
    throw error;
  }
};

// Aggregate from the same fetched data for the screen and reports.
export const aggregateTeamStats = (
  games: Game[],
  registeredTeamIds: string[],
  gameTypeFilter: GameTypeFilter = 'all'
): TeamStats[] => {
  const ids = new Set(registeredTeamIds.filter(Boolean));
  const teamStatsMap: Map<string, TeamStats> = new Map();

  for (const game of games.filter((item) =>
    matchesGameTypeFilter(item, gameTypeFilter)
  )) {
    if (ids.has(game.homeTeam.id)) {
      processTeamStats(
        teamStatsMap,
        game.homeTeam,
        game,
        false,
        gameTypeFilter
      );
    }
    if (ids.has(game.awayTeam.id)) {
      processTeamStats(teamStatsMap, game.awayTeam, game, true, gameTypeFilter);
    }
  }

  return Array.from(teamStatsMap.values()).sort((a, b) => b.wins - a.wins);
};

export const buildTeamReportStats = (
  games: Game[],
  team: TeamSetting
): TeamStats[] => {
  const ids = new Set<string>();
  for (const player of team.players) {
    if (!player.id || !player.id.trim() || ids.has(player.id)) {
      throw new Error('選手IDを一意に扱えません。登録名簿を確認してください');
    }
    ids.add(player.id);
  }

  return (['official', 'practice', 'junior'] as const).map((type) => {
    const stats =
      aggregateTeamStats(games, [team.id], type)[0] ||
      createEmptyTeamStats(team.id, team.name);
    stats.teamName = team.name;
    const recordedIds = new Set(
      stats.playerStats.map((player) => player.playerId)
    );
    const missing = team.players
      .filter((player) => !recordedIds.has(player.id))
      .map((player) =>
        createEmptyPlayerStats({ ...player, isActive: false, order: 0 })
      )
      .sort(
        (a, b) =>
          (parseInt(a.playerNumber) || 0) - (parseInt(b.playerNumber) || 0)
      );
    stats.playerStats.push(...missing);
    return stats;
  });
};

// 試合の勝敗を判定
const determineGameResult = (
  homeScore: number,
  awayScore: number
): 'win' | 'loss' | 'draw' => {
  if (homeScore > awayScore) {
    return 'win';
  } else if (homeScore < awayScore) {
    return 'loss';
  } else {
    return 'draw';
  }
};

// チームの成績を処理
const processTeamStats = (
  statsMap: Map<string, TeamStats>,
  team: Team,
  game: Game,
  isAwayTeam: boolean,
  gameTypeFilter: GameTypeFilter
) => {
  // チームIDで既存の統計を探すか、新しい統計を作成
  if (!statsMap.has(team.id)) {
    statsMap.set(team.id, createEmptyTeamStats(team.id, team.name));
  }

  const teamStats = statsMap.get(team.id)!;

  // ゲーム数増加
  teamStats.gameCount++;

  // 得点計算
  const homeScore = ScoreCalculator.calculateTotalScore(
    game.homeTeam,
    game.runEvents || [],
    false
  );
  const awayScore = ScoreCalculator.calculateTotalScore(
    game.awayTeam,
    game.runEvents || [],
    true
  );

  // 自チームの得点と失点
  if (isAwayTeam) {
    teamStats.totalRuns += awayScore;
    teamStats.totalRunsAllowed += homeScore;

    // 勝敗判定（アウェイチーム）
    const result = determineGameResult(homeScore, awayScore);
    if (result === 'win') {
      teamStats.losses++;
    } else if (result === 'loss') {
      teamStats.wins++;
    } else {
      teamStats.draws++;
    }
  } else {
    teamStats.totalRuns += homeScore;
    teamStats.totalRunsAllowed += awayScore;

    // 勝敗判定（ホームチーム）
    const result = determineGameResult(homeScore, awayScore);
    if (result === 'win') {
      teamStats.wins++;
    } else if (result === 'loss') {
      teamStats.losses++;
    } else {
      teamStats.draws++;
    }
  }

  // 打撃成績の集計
  aggregateBattingStats(teamStats.battingStats, team.atBats);

  // 選手ごとの打撃成績を集計
  aggregatePlayerBattingStats(teamStats, team, gameTypeFilter);
};

// 空の通算成績オブジェクトを作成
const createEmptyTeamStats = (teamId: string, teamName: string): TeamStats => {
  return {
    teamId,
    teamName,
    gameCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalRuns: 0,
    totalRunsAllowed: 0,
    battingStats: {
      atBats: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      sacrificeFlies: 0,
      strikeouts: 0,
      rbis: 0,
      battingAvg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
    },
    playerStats: [], // 選手ごとの打撃成績を初期化
  };
};

// 打撃成績を集計
const BATTING_COUNT_KEYS = [
  'atBats',
  'hits',
  'singles',
  'doubles',
  'triples',
  'homeRuns',
  'walks',
  'sacrificeFlies',
  'strikeouts',
  'rbis',
] as const;

const aggregateBattingStats = (stats: BattingStats, atBats: AtBat[]) => {
  const addedStats = ScoreCalculator.calculateBattingStats(atBats);
  for (const key of BATTING_COUNT_KEYS) {
    stats[key] += addedStats[key];
  }
  Object.assign(stats, ScoreCalculator.calculateBattingRates(stats));
};

// 選手ごとの打撃成績を集計
const aggregatePlayerBattingStats = (
  teamStats: TeamStats,
  team: Team,
  gameTypeFilter: GameTypeFilter
) => {
  // Count each player ID once per saved roster, including zero-at-bat reserves.
  getTeamPlayers(team).forEach((player) => {
    // 既存の選手の成績を探すか、新しく作成する
    let playerStats = teamStats.playerStats.find(
      (ps) => ps.playerId === player.id
    );

    // 選手成績がまだ存在しない場合は新規作成
    if (!playerStats) {
      playerStats = createEmptyPlayerStats(player);
      teamStats.playerStats.push(playerStats);
    }

    // Count saved roster registrations, not inferred appearances.
    playerStats.gameCount++;

    // この選手の打席を抽出
    const playerAtBats = team.atBats.filter(
      (atBat) => atBat.playerId === player.id
    );

    aggregateBattingStats(playerStats, playerAtBats);
    playerStats.plateAppearances += playerAtBats.length;
  });

  // 規定到達の有無と背番号でソート
  teamStats.playerStats.sort((a, b) => {
    // 規定に到達した選手を優先
    const aQualifies = meetsQualification(gameTypeFilter, a);
    const bQualifies = meetsQualification(gameTypeFilter, b);

    if (aQualifies && !bQualifies) return -1;
    if (!aQualifies && bQualifies) return 1;

    // 背番号でソート（数値変換して比較）
    const aNumber = parseInt(a.playerNumber) || 0;
    const bNumber = parseInt(b.playerNumber) || 0;
    return aNumber - bNumber;
  });
};

// 空の選手打撃成績オブジェクトを作成
const createEmptyPlayerStats = (player: Player): PlayerBattingStats => {
  return {
    playerId: player.id,
    playerName: player.name,
    playerNumber: player.number,
    playerPosition: player.position,
    gameCount: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    rbis: 0,
    battingAvg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
  };
};
