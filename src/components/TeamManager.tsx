import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Typography,
  Paper,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Team, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';
import PlayerList from './PlayerList';

interface TeamManagerProps {
  team: Team;
  onTeamUpdate: (updatedTeam: Team) => void;
  onRegisterAtBat?: (playerId: string) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ 
  team, 
  onTeamUpdate,
  onRegisterAtBat
}) => {
  const [openPlayerDialog, setOpenPlayerDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [playerOrder, setPlayerOrder] = useState('');
  
  // チーム名編集用の状態
  const [openTeamNameDialog, setOpenTeamNameDialog] = useState(false);
  const [teamName, setTeamName] = useState(team.name);

  // 選手追加ダイアログを開く
  const handleOpenAddPlayerDialog = () => {
    setEditingPlayer(null);
    setPlayerName('');
    setPlayerNumber('');
    setPlayerPosition('');
    setPlayerOrder('');
    setOpenPlayerDialog(true);
  };

  // 選手編集ダイアログを開く
  const handleEditPlayer = (playerId: string) => {
    const player = team.players.find(p => p.id === playerId);
    if (player) {
      setEditingPlayer(player);
      setPlayerName(player.name);
      setPlayerNumber(player.number);
      setPlayerPosition(player.position);
      setPlayerOrder(player.order.toString());
      setOpenPlayerDialog(true);
    }
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenPlayerDialog(false);
  };

  // 選手の追加または更新
  const handleSavePlayer = () => {
    if (!playerName || !playerNumber || !playerPosition || !playerOrder) {
      return; // 必須フィールドが入力されていない場合は何もしない
    }

    const order = parseInt(playerOrder);
    if (isNaN(order)) {
      return; // 打順が数値でない場合は何もしない
    }

    if (editingPlayer) {
      // 既存の選手を更新
      const updatedPlayers = team.players.map(p => 
        p.id === editingPlayer.id 
          ? { ...p, name: playerName, number: playerNumber, position: playerPosition, order }
          : p
      );
      onTeamUpdate({ ...team, players: updatedPlayers });
    } else {
      // 新しい選手を追加
      const newPlayer: Player = {
        id: uuidv4(),
        name: playerName,
        number: playerNumber,
        position: playerPosition,
        isActive: true,
        order
      };
      onTeamUpdate({ ...team, players: [...team.players, newPlayer] });
    }

    handleCloseDialog();
  };

  // 選手の状態を切り替える（出場中 <-> 控え）
  const handleTogglePlayerStatus = (playerId: string) => {
    const updatedPlayers = team.players.map(p => 
      p.id === playerId ? { ...p, isActive: !p.isActive } : p
    );
    onTeamUpdate({ ...team, players: updatedPlayers });
  };

  // チーム名編集ダイアログを開く
  const handleOpenTeamNameDialog = () => {
    setTeamName(team.name);
    setOpenTeamNameDialog(true);
  };

  // チーム名編集ダイアログを閉じる
  const handleCloseTeamNameDialog = () => {
    setOpenTeamNameDialog(false);
  };

  // チーム名を保存
  const handleSaveTeamName = () => {
    if (teamName.trim()) {
      onTeamUpdate({ ...team, name: teamName.trim() });
    }
    handleCloseTeamNameDialog();
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5">{team.name}</Typography>
            <Tooltip title="チーム名を編集">
              <IconButton onClick={handleOpenTeamNameDialog} size="small" sx={{ ml: 1 }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleOpenAddPlayerDialog}
            >
              選手を追加
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <PlayerList 
        players={team.players} 
        onRegisterAtBat={onRegisterAtBat}
        onToggleStatus={handleTogglePlayerStatus}
        onEditPlayer={handleEditPlayer}
      />

      {/* 選手追加/編集ダイアログ */}
      <Dialog open={openPlayerDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingPlayer ? '選手情報を編集' : '新しい選手を追加'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="名前"
            fullWidth
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="背番号"
            fullWidth
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="ポジション"
            fullWidth
            value={playerPosition}
            onChange={(e) => setPlayerPosition(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="打順"
            type="number"
            fullWidth
            value={playerOrder}
            onChange={(e) => setPlayerOrder(e.target.value)}
            InputProps={{ inputProps: { min: 1, max: 9 } }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button onClick={handleSavePlayer} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* チーム名編集ダイアログ */}
      <Dialog open={openTeamNameDialog} onClose={handleCloseTeamNameDialog}>
        <DialogTitle>チーム名を編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="チーム名"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeamNameDialog}>キャンセル</Button>
          <Button onClick={handleSaveTeamName} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManager; 