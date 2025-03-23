import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography,
  Button,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  onRegisterAtBat?: (player: Player) => void;
  onToggleStatus?: (playerId: string) => void;
  onEditPlayer?: (playerId: string) => void;
  onUpdatePlayerOrder?: (playerId: string, order: number) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  onRegisterAtBat, 
  onToggleStatus,
  onEditPlayer,
  onUpdatePlayerOrder
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // playersが未定義またはnullの場合は空配列を使用
  const playersList = players || [];
  
  // 打順でソート
  const sortedPlayers = [...playersList].sort((a, b) => a.order - b.order);
  
  // 出場中の選手と控えの選手を分ける
  const activePlayers = sortedPlayers.filter(player => player.isActive);
  const benchPlayers = sortedPlayers.filter(player => !player.isActive);

  // 打順変更ハンドラー
  const handleOrderChange = (playerId: string, event: SelectChangeEvent<number>) => {
    if (onUpdatePlayerOrder) {
      const newOrder = Number(event.target.value);
      onUpdatePlayerOrder(playerId, newOrder);
    }
  };

  // 打順選択用の選択肢を生成（1～9）
  const orderOptions = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ p: 2 }}>選手一覧</Typography>
      
      {/* 出場中の選手 */}
      <Typography variant="subtitle1" sx={{ px: 2, fontWeight: 'bold', bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
        出場中の選手
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>打順</TableCell>
            <TableCell>{isMobile ? '番号' : '背番号'}</TableCell>
            <TableCell>名前</TableCell>
            <TableCell>{isMobile ? 'ポジ' : 'ポジション'}</TableCell>
            <TableCell>アクション</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activePlayers.length > 0 ? (
            activePlayers.map((player) => (
              <TableRow 
                key={player.id} 
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                }}
              >
                <TableCell>
                  {onUpdatePlayerOrder ? (
                    <FormControl size="small" sx={{ minWidth: 65 }}>
                      <Select
                        value={player.order === 0 ? '' : player.order}
                        onChange={(e: SelectChangeEvent<number>) => handleOrderChange(player.id, e)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>未設定</em>
                        </MenuItem>
                        {orderOptions.map((order) => (
                          <MenuItem key={order} value={order}>
                            {order}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    player.order || '未設定'
                  )}
                </TableCell>
                <TableCell>{player.number}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.position}</TableCell>
                <TableCell>
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 0.5, 
                    '& .MuiButton-root': { 
                      minWidth: isMobile ? '36px' : '64px',
                      padding: isMobile ? '4px 8px' : undefined 
                    } 
                  }}>
                    {onRegisterAtBat && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => onRegisterAtBat(player)}
                        color="primary"
                        startIcon={isMobile ? <AssignmentIcon fontSize="small" /> : undefined}
                      >
                        {isMobile ? '打席' : '打席登録'}
                      </Button>
                    )}
                    {onToggleStatus && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => onToggleStatus(player.id)}
                        color="secondary"
                        startIcon={isMobile ? <PersonOffIcon fontSize="small" /> : undefined}
                      >
                        {isMobile ? '控え' : '控えに'}
                      </Button>
                    )}
                    {onEditPlayer && (
                      <Tooltip title="選手情報を編集">
                        <IconButton 
                          size="small" 
                          onClick={() => onEditPlayer(player.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">出場中の選手がいません</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* 控えの選手 */}
      {benchPlayers.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ px: 2, mt: 2, fontWeight: 'bold', bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
            控えの選手
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>打順</TableCell>
                <TableCell>{isMobile ? '番号' : '背番号'}</TableCell>
                <TableCell>名前</TableCell>
                <TableCell>{isMobile ? 'ポジ' : 'ポジション'}</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {benchPlayers.map((player) => (
                <TableRow 
                  key={player.id} 
                  sx={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  <TableCell>
                    {onUpdatePlayerOrder ? (
                      <FormControl size="small" sx={{ minWidth: 65 }}>
                        <Select
                          value={player.order === 0 ? '' : player.order}
                          onChange={(e: SelectChangeEvent<number>) => handleOrderChange(player.id, e)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>未設定</em>
                          </MenuItem>
                          {orderOptions.map((order) => (
                            <MenuItem key={order} value={order}>
                              {order}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      player.order || '未設定'
                    )}
                  </TableCell>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 0.5,
                      '& .MuiButton-root': { 
                        minWidth: isMobile ? '36px' : '64px',
                        padding: isMobile ? '4px 8px' : undefined 
                      } 
                    }}>
                      {onToggleStatus && (
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => onToggleStatus(player.id)}
                          color="success"
                          startIcon={isMobile ? <PersonIcon fontSize="small" /> : undefined}
                        >
                          {isMobile ? '出場' : '出場させる'}
                        </Button>
                      )}
                      {onEditPlayer && (
                        <Tooltip title="選手情報を編集">
                          <IconButton 
                            size="small" 
                            onClick={() => onEditPlayer(player.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </TableContainer>
  );
};

export default PlayerList; 