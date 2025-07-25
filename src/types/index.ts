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
  | 'GO_RF' // ライトゴロ (Ground Out to Right)
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
  userId?: string; // ユーザーID（オプショナル）
  userEmail?: string; // ユーザーのメールアドレス（オプショナル）
  venue?: string; // 球場・場所
  tournament?: string; // 大会名
  isPublic?: boolean; // 公開状態
  runEvents?: RunEvent[]; // 打席以外での得点イベント
  outEvents?: OutEvent[]; // 打席以外でのアウトイベント
}

// 得点イベントの種類
export type RunEventType =
  | '押し出し'
  | 'ワイルドピッチ'
  | 'パスボール'
  | '盗塁'
  | '投手エラー'
  | 'その他';

// 打席以外での得点イベント
export interface RunEvent {
  id: string;
  inning: number;
  isTop: boolean; // true: 表, false: 裏
  runType: RunEventType;
  runCount: number;
  note?: string;
  timestamp: any; // Firestore timestamp
}

// アウトイベントの種類
export type OutEventType =
  | '牽制アウト'
  | '盗塁死'
  | 'タッチアウト'
  | 'フォースアウト'
  | '飛球失策'
  | '打順間違い'
  | 'その他';

// 打席以外でのアウトイベント
export interface OutEvent {
  id: string;
  inning: number;
  isTop: boolean; // true: 表, false: 裏
  outType: OutEventType;
  note?: string;
  timestamp: any; // Firestore timestamp
}

// 保存用の選手情報
export interface PlayerSetting {
  id: string;
  name: string;
  number: string;
  position: string;
  createdAt?: any; // Firestore timestamp
}

// 保存用のチーム情報
export interface TeamSetting {
  id: string;
  name: string;
  players: PlayerSetting[];
  userId: string;
  userEmail?: string;
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
}
