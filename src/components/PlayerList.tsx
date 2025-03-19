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
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  onRegisterAtBat?: (player: Player) => void;
  onToggleStatus?: (playerId: string) => void;
  onEditPlayer?: (playerId: string) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  onRegisterAtBat, 
  onToggleStatus,
  onEditPlayer
}) => {
  const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
  
  // 出場中の選手と控えの選手を分ける
  const activePlayers = sortedPlayers.filter(player => player.isActive);
  const benchPlayers = sortedPlayers.filter(player => !player.isActive);

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
            <TableCell>背番号</TableCell>
            <TableCell>名前</TableCell>
            <TableCell>ポジション</TableCell>
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
                <TableCell>{player.order}</TableCell>
                <TableCell>{player.number}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.position}</TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => onRegisterAtBat && onRegisterAtBat(player)}
                    color="primary"
                  >
                    打席登録
                  </Button>
                  {onToggleStatus && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => onToggleStatus(player.id)}
                      color="secondary"
                      sx={{ ml: 1 }}
                    >
                      控えにする
                    </Button>
                  )}
                  {onEditPlayer && (
                    <Tooltip title="選手情報を編集">
                      <IconButton 
                        size="small" 
                        onClick={() => onEditPlayer(player.id)}
                        sx={{ ml: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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
                <TableCell>背番号</TableCell>
                <TableCell>名前</TableCell>
                <TableCell>ポジション</TableCell>
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
                  <TableCell>{player.order}</TableCell>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    {onToggleStatus && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => onToggleStatus(player.id)}
                        color="success"
                      >
                        出場させる
                      </Button>
                    )}
                    {onEditPlayer && (
                      <Tooltip title="選手情報を編集">
                        <IconButton 
                          size="small" 
                          onClick={() => onEditPlayer(player.id)}
                          sx={{ ml: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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