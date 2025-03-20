import React from 'react';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Tooltip,
  IconButton,
  Box,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { AtBat, Player, HitResult, RunEvent } from '../types';

interface AtBatHistoryProps {
  atBats: AtBat[];
  players: Player[];
  inning: number;
  runEvents?: RunEvent[];
  onEditAtBat?: (atBat: AtBat) => void;
  onDeleteAtBat?: (atBatId: string) => void;
  onDeleteRunEvent?: (eventId: string) => void;
  currentTeamName?: string;  // 現在選択中のチーム名
  opposingTeamName?: string; // 相手チーム名
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
  'GO_RF': 'ライトゴロ',
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

const AtBatHistory: React.FC<AtBatHistoryProps> = ({ 
  atBats, 
  players, 
  inning,
  runEvents = [],
  onEditAtBat,
  onDeleteAtBat,
  onDeleteRunEvent,
  currentTeamName = '自チーム',
  opposingTeamName = '相手チーム'
}) => {
  // 指定されたイニングの打席結果のみをフィルタリング
  const filteredAtBats = atBats.filter(atBat => atBat.inning === inning);
  
  // 指定されたイニングの得点イベントのみをフィルタリング
  const filteredRunEvents = runEvents.filter(event => event.inning === inning);
  
  // 打席結果も得点イベントもない場合
  if (filteredAtBats.length === 0 && filteredRunEvents.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {inning}回の記録
        </Typography>
        <Typography>
          まだ記録がありません
        </Typography>
      </Paper>
    );
  }

  // プレイヤーIDから選手名を取得する関数
  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} (${player.position})` : '不明な選手';
  };

  // 結果に応じた色を返す関数
  const getResultColor = (result: HitResult): 'success' | 'error' | 'warning' | 'default' | 'info' | 'secondary' => {
    // ヒット系
    if (['IH', 'LH', 'CH', 'RH'].includes(result)) {
      return 'success';
    } 
    // 長打系
    else if (['2B', '3B'].includes(result)) {
      return 'warning';
    } 
    // ホームラン
    else if (result === 'HR') {
      return 'error';
    } 
    // 四球系
    else if (['BB', 'HBP'].includes(result)) {
      return 'info';
    }
    // エラー
    else if (result === 'E') {
      return 'secondary';
    }
    // その他
    else {
      return 'default';
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {inning}回の記録
      </Typography>
      
      {/* 打席結果がある場合に表示 */}
      {filteredAtBats.length > 0 && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            打席結果
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>選手</TableCell>
                  <TableCell>結果</TableCell>
                  <TableCell>打点</TableCell>
                  <TableCell>詳細</TableCell>
                  {(onEditAtBat || onDeleteAtBat) && <TableCell>操作</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAtBats.map((atBat) => (
                  <TableRow key={atBat.id}>
                    <TableCell>{getPlayerName(atBat.playerId)}</TableCell>
                    <TableCell>
                      <Tooltip title={hitResultLabels[atBat.result]}>
                        <Chip 
                          label={atBat.result} 
                          color={getResultColor(atBat.result)}
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>{atBat.rbi || 0}</TableCell>
                    <TableCell>{atBat.description || '-'}</TableCell>
                    {(onEditAtBat || onDeleteAtBat) && (
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          {onEditAtBat && (
                            <Tooltip title="編集">
                              <IconButton 
                                size="small" 
                                onClick={() => onEditAtBat(atBat)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onDeleteAtBat && (
                            <Tooltip title="削除">
                              <IconButton 
                                size="small" 
                                onClick={() => onDeleteAtBat(atBat.id)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      
      {/* 得点イベントがある場合に表示 */}
      {filteredRunEvents.length > 0 && (
        <>
          {filteredAtBats.length > 0 && <Divider sx={{ my: 2 }} />}
          
          <Typography variant="subtitle1" gutterBottom>
            その他の得点
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>種類</TableCell>
                  <TableCell>得点</TableCell>
                  <TableCell>メモ</TableCell>
                  {onDeleteRunEvent && <TableCell>操作</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRunEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Chip 
                        label={event.runType} 
                        color="secondary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{event.runCount}点</TableCell>
                    <TableCell>{event.note || '-'}</TableCell>
                    {onDeleteRunEvent && (
                      <TableCell>
                        <Tooltip title="削除">
                          <IconButton 
                            size="small" 
                            onClick={() => onDeleteRunEvent(event.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};

export default AtBatHistory; 