import React, { useState, useEffect } from 'react';
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
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import GroupsIcon from '@mui/icons-material/Groups';
import { Team, Player, TeamSetting } from '../types';
import { v4 as uuidv4 } from 'uuid';
import PlayerList from './PlayerList';
import { getUserTeams, getTeamById } from '../firebase/teamService';

interface TeamManagerProps {
  team: Team;
  onTeamUpdate: (updatedTeam: Team) => void;
  onRegisterAtBat?: (player: Player) => void;
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

  // チーム選択関連の状態
  const [openTeamSelectionDialog, setOpenTeamSelectionDialog] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<TeamSetting[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamSelectionError, setTeamSelectionError] = useState<string | null>(null);

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

  // チーム選択ダイアログを開く
  const handleOpenTeamSelectionDialog = async () => {
    try {
      setLoadingTeams(true);
      setTeamSelectionError(null);
      const teams = await getUserTeams();
      setAvailableTeams(teams);
      setOpenTeamSelectionDialog(true);
    } catch (error: any) {
      console.error('チームの読み込みに失敗しました:', error);
      setTeamSelectionError(`チームの読み込みに失敗しました: ${error.message}`);
    } finally {
      setLoadingTeams(false);
    }
  };

  // チーム選択ダイアログを閉じる
  const handleCloseTeamSelectionDialog = () => {
    setOpenTeamSelectionDialog(false);
    setTeamSelectionError(null);
  };

  // 選択したチームでデータを更新
  const handleSelectTeam = async (teamSettingId: string) => {
    try {
      setLoadingTeams(true);
      setTeamSelectionError(null);
      
      const teamSetting = await getTeamById(teamSettingId);
      if (!teamSetting) {
        throw new Error('チームデータの取得に失敗しました');
      }
      
      // 登録済みのチーム情報から現在の試合用のチームデータを作成
      const updatedTeam: Team = {
        ...team,
        id: teamSetting.id,
        name: teamSetting.name,
        players: teamSetting.players.map(player => ({
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position,
          isActive: true,
          order: 0 // 初期値は0に設定
        }))
        // 注意: atBatsは維持されます
      };
      
      onTeamUpdate(updatedTeam);
      handleCloseTeamSelectionDialog();
    } catch (error: any) {
      console.error('チームの選択に失敗しました:', error);
      setTeamSelectionError(`チームの選択に失敗しました: ${error.message}`);
    } finally {
      setLoadingTeams(false);
    }
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<GroupsIcon />}
                onClick={handleOpenTeamSelectionDialog}
                color="secondary"
              >
                チームを選択
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleOpenAddPlayerDialog}
              >
                選手を追加
              </Button>
            </Box>
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

      {/* チーム選択ダイアログ */}
      <Dialog 
        open={openTeamSelectionDialog} 
        onClose={handleCloseTeamSelectionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <SportsBaseballIcon sx={{ mr: 1 }} />
          登録済みのチームから選択
        </DialogTitle>
        <DialogContent>
          {loadingTeams ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : teamSelectionError ? (
            <Typography color="error" sx={{ p: 2 }}>
              {teamSelectionError}
            </Typography>
          ) : availableTeams.length === 0 ? (
            <Typography sx={{ p: 2 }}>
              登録済みのチームがありません。メニューの「チーム・選手管理」からチームを登録してください。
            </Typography>
          ) : (
            <List>
              {availableTeams.map((teamSetting) => (
                <React.Fragment key={teamSetting.id}>
                  <ListItem 
                    component="div"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSelectTeam(teamSetting.id)}
                  >
                    <ListItemText 
                      primary={teamSetting.name} 
                      secondary={`選手数: ${teamSetting.players?.length || 0}人`}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeamSelectionDialog}>
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamManager; 