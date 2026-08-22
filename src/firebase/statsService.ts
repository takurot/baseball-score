import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './config';
import { Game, Team, AtBat, Player } from '../types';
import { getCurrentUser } from './authService';
import { BattingStats, ScoreCalculator } from '../services/ScoreCalculator';

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
}

// ゲームコレクションの定数
const GAMES_COLLECTION = 'games';

// チームごとの通算成績を取得
export const getAllTeamStats = async (): Promise<TeamStats[]> => {
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

    const querySnapshot = await getDocs(q);
    const games = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Game;
      return { ...data, id: doc.id };
    });

    // チームIDをキーとした成績集計マップ
    const teamStatsMap: Map<string, TeamStats> = new Map();

    // 全ゲームをループして各チームの成績を集計
    for (const game of games) {
      // ホームチームの処理
      processTeamStats(teamStatsMap, game.homeTeam, game, false);

      // アウェイチームの処理
      processTeamStats(teamStatsMap, game.awayTeam, game, true);
    }

    // マップから配列に変換して返却
    return Array.from(teamStatsMap.values()).sort((a, b) => b.wins - a.wins);
  } catch (error) {
    console.error('Error getting team stats:', error);
    throw error;
  }
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
  isAwayTeam: boolean
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
  aggregatePlayerBattingStats(teamStats, team);
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
const aggregatePlayerBattingStats = (teamStats: TeamStats, team: Team) => {
  // 選手ごとに集計する
  team.players.forEach((player) => {
    // 既存の選手の成績を探すか、新しく作成する
    let playerStats = teamStats.playerStats.find(
      (ps) => ps.playerId === player.id
    );

    // 選手成績がまだ存在しない場合は新規作成
    if (!playerStats) {
      playerStats = createEmptyPlayerStats(player);
      teamStats.playerStats.push(playerStats);
    }

    // 試合出場数をカウント
    playerStats.gameCount++;

    // この選手の打席を抽出
    const playerAtBats = team.atBats.filter(
      (atBat) => atBat.playerId === player.id
    );

    aggregateBattingStats(playerStats, playerAtBats);
  });

  // プレイヤー成績を打率の降順でソート
  teamStats.playerStats.sort((a, b) => {
    // 打席数が一定数以上ある選手を優先
    const minAtBats = 10;
    const aHasMinAtBats = a.atBats >= minAtBats;
    const bHasMinAtBats = b.atBats >= minAtBats;

    if (aHasMinAtBats && !bHasMinAtBats) return -1;
    if (!aHasMinAtBats && bHasMinAtBats) return 1;

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
