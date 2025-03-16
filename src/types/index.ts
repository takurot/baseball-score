// 打撃結果の種類
export type HitResult = 
  // ヒット
  | 'IH' // 内野安打 (Infield Hit)
  | 'LH' // レフトヒット (Left Hit)
  | 'CH' // センターヒット (Center Hit)
  | 'RH' // ライトヒット (Right Hit)
  | '2B' // 二塁打 (Double)
  | '3B' // 三塁打 (Triple)
  | 'HR' // ホームラン (Home Run)
  
  // アウト
  | 'GO_P' // ピッチャーゴロ (Ground Out to Pitcher)
  | 'GO_C' // キャッチャーゴロ (Ground Out to Catcher)
  | 'GO_1B' // ファーストゴロ (Ground Out to 1st)
  | 'GO_2B' // セカンドゴロ (Ground Out to 2nd)
  | 'GO_3B' // サードゴロ (Ground Out to 3rd)
  | 'GO_SS' // ショートゴロ (Ground Out to Shortstop)
  | 'FO_LF' // レフトフライ (Fly Out to Left)
  | 'FO_CF' // センターフライ (Fly Out to Center)
  | 'FO_RF' // ライトフライ (Fly Out to Right)
  | 'FO_IF' // 内野フライ (Infield Fly)
  | 'LO' // ライナーアウト (Line Out)
  | 'DP' // 併殺打 (Double Play)
  
  // その他
  | 'SAC' // 犠打 (Sacrifice Bunt)
  | 'SF' // 犠飛 (Sacrifice Fly)
  | 'BB' // 四球 (Base on Balls)
  | 'HBP' // 死球 (Hit By Pitch)
  | 'SO' // 三振 (Strike Out)
  | 'E' // エラー (Error)
  | 'FC' // フィールダーチョイス (Fielder's Choice)
  | 'OTH'; // その他 (Other)

// 打席結果
export interface AtBat {
  id: string;
  playerId: string;
  inning: number;
  result: HitResult;
  description?: string;
  rbi: number;
  isOut: boolean;
}

// 選手情報
export interface Player {
  id: string;
  name: string;
  number: string;
  position: string;
  isActive: boolean;
  order: number;
}

// チーム情報
export interface Team {
  id: string;
  name: string;
  players: Player[];
  atBats: AtBat[];
}

// 試合情報
export interface Game {
  id: string;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  currentInning: number;
} 