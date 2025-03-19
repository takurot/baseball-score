import React from 'react';
import { 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  Tooltip,
  Chip,
  Box,
  Stack
} from '@mui/material';
import { Team, AtBat, HitResult } from '../types';

interface AtBatSummaryTableProps {
  team: Team;
  maxInning: number;
}

// 打撃結果の表示名マッピング
const hitResultLabels: Record<HitResult, string> = {
  // ヒット
  'IH': '内野安打',
  'LH': 'レフトヒット',
  'CH': 'センターヒット',
  'RH': 'ライトヒット',
  '2B': '二塁打',
  '3B': '三塁打',
  'HR': 'ホームラン',
  
  // アウト
  'GO_P': 'ピッチャーゴロ',
  'GO_C': 'キャッチャーゴロ',
  'GO_1B': 'ファーストゴロ',
  'GO_2B': 'セカンドゴロ',
  'GO_3B': 'サードゴロ',
  'GO_SS': 'ショートゴロ',
  'FO_LF': 'レフトフライ',
  'FO_CF': 'センターフライ',
  'FO_RF': 'ライトフライ',
  'FO_IF': '内野フライ',
  'LO': 'ライナー',
  'DP': '併殺打',
  
  // その他
  'SAC': '犠打',
  'SF': '犠飛',
  'BB': '四球',
  'HBP': '死球',
  'SO': '三振',
  'E': 'エラー',
  'FC': 'フィールダーチョイス',
  'OTH': 'その他'
};

// カスタムカラー定義
const customColors = {
  hit: '#FFA726', // オレンジ（ヒット）
  double: '#FB8C00', // 濃いオレンジ（二塁打）
  triple: '#F57C00', // さらに濃いオレンジ（三塁打）
  homerun: '#E65100', // 最も濃いオレンジ（ホームラン）
  walk: '#2196F3', // 青（四球系）
  error: '#9C27B0', // 紫（エラー）
  out: '#9E9E9E' // グレー（アウト）
};

// 結果に応じた色を返す関数
const getResultColor = (result: HitResult): string => {
  // ヒット系
  if (['IH', 'LH', 'CH', 'RH'].includes(result)) {
    return customColors.hit;
  } 
  // 二塁打
  else if (result === '2B') {
    return customColors.double;
  } 
  // 三塁打
  else if (result === '3B') {
    return customColors.triple;
  } 
  // ホームラン
  else if (result === 'HR') {
    return customColors.homerun;
  } 
  // 四球系
  else if (['BB', 'HBP'].includes(result)) {
    return customColors.walk;
  }
  // エラー
  else if (result === 'E') {
    return customColors.error;
  }
  // その他
  else {
    return customColors.out;
  }
};

// 結果に応じたテキスト色を返す関数
const getTextColor = (result: HitResult): string => {
  // ヒット系、長打系、ホームランは白文字
  if (['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR'].includes(result)) {
    return '#FFFFFF';
  }
  // その他は黒文字
  return '#000000';
};

// 打撃成績を計算するヘルパー関数
interface BattingStats {
  atBats: number;       // 打数
  hits: number;         // 安打数
  rbis: number;         // 打点
  walks: number;        // 四球/死球
  singles: number;      // 単打
  doubles: number;      // 二塁打
  triples: number;      // 三塁打
  homeRuns: number;     // ホームラン
  battingAvg: number;   // 打率
  obp: number;          // 出塁率
  slg: number;          // 長打率
  ops: number;          // OPS
}

// 選手の打撃成績を計算
const calculateBattingStats = (playerAtBats: AtBat[]): BattingStats => {
  const stats: BattingStats = {
    atBats: 0,
    hits: 0,
    rbis: 0,
    walks: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    battingAvg: 0,
    obp: 0,
    slg: 0,
    ops: 0
  };
  
  // 打点の合計
  stats.rbis = playerAtBats.reduce((sum, atBat) => sum + (atBat.rbi || 0), 0);
  
  // 打撃結果の集計
  playerAtBats.forEach(atBat => {
    const result = atBat.result;
    
    // 四球/死球はカウント
    if (result === 'BB' || result === 'HBP') {
      stats.walks++;
      return;
    }
    
    // 犠打/犠飛はカウントしない
    if (result === 'SAC' || result === 'SF') {
      return;
    }
    
    // 打数にカウントするケース
    stats.atBats++;
    
    // 安打の種類に応じてカウント
    if (['IH', 'LH', 'CH', 'RH'].includes(result)) {
      stats.hits++;
      stats.singles++;
    } else if (result === '2B') {
      stats.hits++;
      stats.doubles++;
    } else if (result === '3B') {
      stats.hits++;
      stats.triples++;
    } else if (result === 'HR') {
      stats.hits++;
      stats.homeRuns++;
    }
  });
  
  // 打率計算 (打数が0の場合は0)
  stats.battingAvg = stats.atBats > 0 ? stats.hits / stats.atBats : 0;
  
  // 出塁率計算 (打数+四球が0の場合は0)
  const plateAppearances = stats.atBats + stats.walks;
  stats.obp = plateAppearances > 0 ? (stats.hits + stats.walks) / plateAppearances : 0;
  
  // 長打率計算 (打数が0の場合は0)
  const totalBases = stats.singles + (stats.doubles * 2) + (stats.triples * 3) + (stats.homeRuns * 4);
  stats.slg = stats.atBats > 0 ? totalBases / stats.atBats : 0;
  
  // OPS計算
  stats.ops = stats.obp + stats.slg;
  
  return stats;
};

// 打率などを表示するフォーマット関数
const formatBattingAvg = (value: number): string => {
  // 打率は通常3桁で表示（例: .333）
  return value.toFixed(3).replace(/^0+/, '');
};

const formatOPS = (value: number): string => {
  // OPSは通常3桁で表示（例: 1.000）
  return value.toFixed(3);
};

const AtBatSummaryTable: React.FC<AtBatSummaryTableProps> = ({ team, maxInning }) => {
  // 打順でソートした選手リストを修正
  // 1. 控えかつ打順0の選手を下に表示
  // 2. それ以外は打順でソート
  const sortedPlayers = [...team.players].sort((a, b) => {
    // 控えかつ打順0の選手を下に表示するための条件
    const aIsBenchWithNoOrder = !a.isActive && a.order === 0;
    const bIsBenchWithNoOrder = !b.isActive && b.order === 0;
    
    // 両方とも控え選手で打順0の場合は名前でソート
    if (aIsBenchWithNoOrder && bIsBenchWithNoOrder) {
      return a.name.localeCompare(b.name);
    }
    
    // aのみが控え選手で打順0なら下に
    if (aIsBenchWithNoOrder) {
      return 1;
    }
    
    // bのみが控え選手で打順0なら下に
    if (bIsBenchWithNoOrder) {
      return -1;
    }
    
    // それ以外は通常通り打順でソート
    return a.order - b.order;
  });
  
  // 少年野球なので最大7回まで
  const limitedMaxInning = Math.min(maxInning, 7);
  
  // イニングの配列を作成（1から最大イニングまで）
  const innings = Array.from({ length: limitedMaxInning }, (_, i) => i + 1);

  // 選手ごとのイニングごとの打席結果を取得する関数（複数の結果を返す）
  const getPlayerAtBatsForInning = (playerId: string, inning: number): AtBat[] => {
    return team.atBats.filter(atBat => atBat.playerId === playerId && atBat.inning === inning);
  };

  // 選手の全ての打席結果を取得
  const getPlayerAllAtBats = (playerId: string): AtBat[] => {
    return team.atBats.filter(atBat => atBat.playerId === playerId);
  };

  // 打席結果を表示するセル（複数の結果に対応）
  const renderAtBatCell = (atBats: AtBat[]) => {
    if (!atBats.length) {
      return <TableCell align="center">-</TableCell>;
    }

    return (
      <TableCell align="center">
        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
          {atBats.map((atBat) => {
            const result = atBat.result;
            const rbiText = atBat.rbi ? `(${atBat.rbi})` : '';
            const backgroundColor = getResultColor(result);
            const textColor = getTextColor(result);
            
            return (
              <Tooltip 
                key={atBat.id}
                title={
                  <div>
                    <div>{hitResultLabels[result]}</div>
                    {atBat.description && <div>{atBat.description}</div>}
                    {atBat.rbi ? <div>打点: {atBat.rbi}</div> : null}
                  </div>
                }
              >
                <Chip 
                  label={`${result}${rbiText}`} 
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem', 
                    height: '24px',
                    backgroundColor,
                    color: textColor,
                    fontWeight: ['2B', '3B', 'HR'].includes(result) ? 'bold' : 'normal',
                    margin: '2px'
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
      </TableCell>
    );
  };

  return (
    <Paper sx={{ p: 2, mb: 3, overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {team.name}の打席結果一覧
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2">【凡例】</Typography>
        <Chip size="small" sx={{ backgroundColor: customColors.hit, color: '#FFFFFF' }} label="ヒット" />
        <Chip size="small" sx={{ backgroundColor: customColors.double, color: '#FFFFFF', fontWeight: 'bold' }} label="二塁打" />
        <Chip size="small" sx={{ backgroundColor: customColors.triple, color: '#FFFFFF', fontWeight: 'bold' }} label="三塁打" />
        <Chip size="small" sx={{ backgroundColor: customColors.homerun, color: '#FFFFFF', fontWeight: 'bold' }} label="ホームラン" />
        <Chip size="small" sx={{ backgroundColor: customColors.walk }} label="四球/死球" />
        <Chip size="small" sx={{ backgroundColor: customColors.error, color: '#FFFFFF' }} label="エラー" />
        <Chip size="small" sx={{ backgroundColor: customColors.out }} label="アウト" />
      </Box>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>打順</TableCell>
              <TableCell>選手名</TableCell>
              {innings.map(inning => (
                <TableCell key={inning} align="center">{inning}回</TableCell>
              ))}
              <TableCell align="center">打数</TableCell>
              <TableCell align="center">安打</TableCell>
              <TableCell align="center">打点</TableCell>
              <TableCell align="center">打率</TableCell>
              <TableCell align="center">OPS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers.map((player) => {
              const playerAtBats = getPlayerAllAtBats(player.id);
              const stats = calculateBattingStats(playerAtBats);
              
              return (
                <TableRow key={player.id}>
                  <TableCell>{player.order}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: player.isActive ? 'bold' : 'normal' }}>
                      {player.name}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {player.position} #{player.number}
                    </Typography>
                  </TableCell>
                  {innings.map(inning => renderAtBatCell(getPlayerAtBatsForInning(player.id, inning)))}
                  <TableCell align="center">{stats.atBats}</TableCell>
                  <TableCell align="center">{stats.hits}</TableCell>
                  <TableCell align="center">{stats.rbis}</TableCell>
                  <TableCell align="center">{formatBattingAvg(stats.battingAvg)}</TableCell>
                  <TableCell align="center">{formatOPS(stats.ops)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AtBatSummaryTable; 