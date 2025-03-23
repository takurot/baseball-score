import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Divider, 
  Paper, 
  Grid,
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Alert,
  Chip,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  SportsCricket as SportsCricketIcon
} from '@mui/icons-material';
import { TeamSetting, PlayerSetting } from '../types';
import { 
  getUserTeams, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  addPlayerToTeam,
  updatePlayerInTeam,
  removePlayerFromTeam
} from '../firebase/teamService';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// タブパネルコンポーネント
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-tabpanel-${index}`}
      aria-labelledby={`team-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const TeamList: React.FC = () => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState<TeamSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // チーム関連の状態
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);
  
  // 選手関連の状態
  const [openPlayerDialog, setOpenPlayerDialog] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [confirmDeletePlayerId, setConfirmDeletePlayerId] = useState<string | null>(null);
  
  // アコーディオンの開閉状態
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  
  // アコーディオンの開閉を管理
  const handleAccordionChange = (teamId: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [teamId]: isExpanded
    }));
  };
  
  // チームデータの読み込み - useCallbackでメモ化
  const loadTeams = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const teamsData = await getUserTeams();
      setTeams(teamsData || []);
    } catch (err: any) {
      console.error('Failed to load teams:', err);
      setError('チームデータの読み込みに失敗しました: ' + (err.message || 'エラーが発生しました'));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // 初回読み込み
  useEffect(() => {
    let mounted = true;
    
    const fetchTeams = async () => {
      try {
        setLoading(true);
        await loadTeams();
      } catch (error) {
        console.error("Failed to load teams:", error);
        if (mounted) {
          setError("チームの読み込みに失敗しました");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchTeams();
    
    return () => {
      mounted = false;
    };
  }, [loadTeams]); // loadTeamsが変更されたときだけ実行
  
  // タブ変更ハンドラー
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // チーム追加・編集ダイアログを開く
  const handleOpenTeamDialog = (team?: TeamSetting) => {
    if (team) {
      setTeamName(team.name);
      setEditingTeamId(team.id);
    } else {
      setTeamName('');
      setEditingTeamId(null);
    }
    setOpenTeamDialog(true);
  };
  
  // チーム追加・編集ダイアログを閉じる
  const handleCloseTeamDialog = () => {
    setOpenTeamDialog(false);
    setTeamName('');
    setEditingTeamId(null);
  };
  
  // チーム追加・編集を保存
  const handleSaveTeam = async () => {
    try {
      setError(null);
      
      if (!teamName.trim()) {
        setError('チーム名を入力してください');
        return;
      }
      
      if (editingTeamId) {
        // 既存チームの更新
        await updateTeam(editingTeamId, { name: teamName });
      } else {
        // 新規チーム作成
        await createTeam({ name: teamName, players: [] });
      }
      
      // ダイアログを閉じてデータを再読み込み
      handleCloseTeamDialog();
      await loadTeams();
    } catch (err: any) {
      console.error('Failed to save team:', err);
      setError('チームの保存に失敗しました: ' + err.message);
    }
  };
  
  // チーム削除の確認ダイアログを開く
  const handleConfirmDeleteTeam = (teamId: string) => {
    setConfirmDeleteTeamId(teamId);
  };
  
  // チーム削除の確認ダイアログを閉じる
  const handleCancelDeleteTeam = () => {
    setConfirmDeleteTeamId(null);
  };
  
  // チームを削除
  const handleDeleteTeam = async () => {
    if (!confirmDeleteTeamId) return;
    
    try {
      setError(null);
      await deleteTeam(confirmDeleteTeamId);
      setConfirmDeleteTeamId(null);
      await loadTeams();
    } catch (err: any) {
      console.error('Failed to delete team:', err);
      setError('チームの削除に失敗しました: ' + err.message);
    }
  };
  
  // 選手追加・編集ダイアログを開く
  const handleOpenPlayerDialog = (teamId: string, player?: PlayerSetting) => {
    setCurrentTeamId(teamId);
    
    // アコーディオンを開く状態に設定
    setExpandedAccordions(prev => ({
      ...prev,
      [teamId]: true
    }));
    
    if (player) {
      setPlayerName(player.name);
      setPlayerNumber(player.number);
      setPlayerPosition(player.position);
      setEditingPlayerId(player.id);
    } else {
      setPlayerName('');
      setPlayerNumber('');
      setPlayerPosition('');
      setEditingPlayerId(null);
    }
    
    setOpenPlayerDialog(true);
  };
  
  // 選手追加・編集ダイアログを閉じる
  const handleClosePlayerDialog = () => {
    setOpenPlayerDialog(false);
    setCurrentTeamId(null);
    setPlayerName('');
    setPlayerNumber('');
    setPlayerPosition('');
    setEditingPlayerId(null);
  };
  
  // 選手追加・編集を保存
  const handleSavePlayer = async () => {
    if (!currentTeamId) return;
    
    try {
      setError(null);
      
      if (!playerName.trim()) {
        setError('選手名を入力してください');
        return;
      }
      
      const playerData = {
        name: playerName,
        number: playerNumber,
        position: playerPosition
      };
      
      if (editingPlayerId) {
        // 既存選手の更新
        await updatePlayerInTeam(currentTeamId, editingPlayerId, playerData);
      } else {
        // 新規選手追加
        await addPlayerToTeam(currentTeamId, playerData);
      }
      
      // ダイアログを閉じてデータを再読み込み
      handleClosePlayerDialog();
      await loadTeams();
      
      // 現在のチームのアコーディオンは開いたままにする
      setExpandedAccordions(prev => ({
        ...prev,
        [currentTeamId]: true
      }));
    } catch (err: any) {
      console.error('Failed to save player:', err);
      setError('選手の保存に失敗しました: ' + err.message);
    }
  };
  
  // 選手削除の確認ダイアログを開く
  const handleConfirmDeletePlayer = (playerId: string) => {
    setConfirmDeletePlayerId(playerId);
  };
  
  // 選手削除の確認ダイアログを閉じる
  const handleCancelDeletePlayer = () => {
    setConfirmDeletePlayerId(null);
  };
  
  // 選手を削除
  const handleDeletePlayer = async () => {
    if (!currentTeamId || !confirmDeletePlayerId) return;
    
    try {
      setError(null);
      await removePlayerFromTeam(currentTeamId, confirmDeletePlayerId);
      setConfirmDeletePlayerId(null);
      await loadTeams();
      
      // 現在のチームのアコーディオンは開いたままにする
      setExpandedAccordions(prev => ({
        ...prev,
        [currentTeamId]: true
      }));
    } catch (err: any) {
      console.error('Failed to delete player:', err);
      setError('選手の削除に失敗しました: ' + err.message);
    }
  };
  
  // 選手管理タブの内容
  const renderPlayerManagementTab = () => {
    if (teams.length === 0) {
      return (
        <Typography variant="body1" color="textSecondary" sx={{ my: 4, textAlign: 'center' }}>
          チームがまだ登録されていません。「チーム一覧」タブでチームを追加してください。
        </Typography>
      );
    }
    
    return (
      <>
        {teams.map((team) => (
          <Accordion 
            key={team.id} 
            sx={{ mb: 2 }}
            expanded={!!expandedAccordions[team.id]}
            onChange={handleAccordionChange(team.id)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`team-${team.id}-content`}
              id={`team-${team.id}-header`}
            >
              <Typography variant="h6">{team.name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleOpenPlayerDialog(team.id)}
                >
                  選手を追加
                </Button>
              </Box>
              
              {(!team.players || team.players.length === 0) ? (
                <Typography variant="body2" color="textSecondary">
                  選手が登録されていません。「選手を追加」ボタンをクリックして、選手を追加してください。
                </Typography>
              ) : (
                <List>
                  {team.players.map((player) => (
                    <React.Fragment key={player.id}>
                      <ListItem>
                        <ListItemText
                          primary={`${player.name} ${player.number ? `#${player.number}` : ''}`}
                          secondary={player.position || '役職未設定'}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => {
                              setCurrentTeamId(team.id);
                              handleOpenPlayerDialog(team.id, player);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => {
                              setCurrentTeamId(team.id);
                              handleConfirmDeletePlayer(player.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </>
    );
  };
  
  // ローディング表示
  if (loading) {
    return (
      <Paper sx={{ p: 2, m: 2 }}>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>チーム情報を読み込み中...</Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SportsCricketIcon sx={{ mr: 1 }} />
          チームと選手の管理
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* タブナビゲーション */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="team management tabs">
          <Tab label="チーム一覧" id="team-tab-0" aria-controls="team-tabpanel-0" />
          <Tab label="選手管理" id="team-tab-1" aria-controls="team-tabpanel-1" />
        </Tabs>
      </Box>
      
      {/* チーム一覧タブ */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpenTeamDialog()}
          >
            新しいチームを作成
          </Button>
        </Box>
        
        {teams.length === 0 ? (
          <Typography variant="body1" color="textSecondary" sx={{ my: 4, textAlign: 'center' }}>
            チームがまだ登録されていません。「新しいチームを作成」ボタンをクリックして、チームを追加してください。
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {teams.map((team) => (
              <Grid item xs={12} sm={6} md={4} key={team.id}>
                <Card>
                  <CardHeader
                    title={team.name}
                    subheader={`登録選手数: ${team.players?.length || 0}人`}
                  />
                  <CardContent>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {team.players?.slice(0, 5).map((player) => (
                        <Chip 
                          key={player.id} 
                          label={`${player.name} ${player.number ? `#${player.number}` : ''}`} 
                          size="small"
                          icon={<PersonIcon />}
                        />
                      ))}
                      {team.players && team.players.length > 5 && (
                        <Chip 
                          label={`+${team.players.length - 5}人`} 
                          size="small" 
                          variant="outlined" 
                        />
                      )}
                      {(!team.players || team.players.length === 0) && (
                        <Typography variant="body2" color="textSecondary">
                          選手が登録されていません
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenTeamDialog(team)}
                    >
                      編集
                    </Button>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleConfirmDeleteTeam(team.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      {/* 選手管理タブ */}
      <TabPanel value={tabValue} index={1}>
        {renderPlayerManagementTab()}
      </TabPanel>
      
      {/* チーム追加・編集ダイアログ */}
      <Dialog open={openTeamDialog} onClose={handleCloseTeamDialog}>
        <DialogTitle>{editingTeamId ? 'チーム情報を編集' : '新しいチームを作成'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="team-name"
            label="チーム名"
            type="text"
            fullWidth
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeamDialog}>キャンセル</Button>
          <Button onClick={handleSaveTeam} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 選手追加・編集ダイアログ */}
      <Dialog open={openPlayerDialog} onClose={handleClosePlayerDialog}>
        <DialogTitle>{editingPlayerId ? '選手情報を編集' : '新しい選手を追加'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="player-name"
            label="選手名"
            type="text"
            fullWidth
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="player-number"
            label="背番号"
            type="text"
            fullWidth
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="player-position"
            label="ポジション"
            type="text"
            fullWidth
            value={playerPosition}
            onChange={(e) => setPlayerPosition(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePlayerDialog}>キャンセル</Button>
          <Button onClick={handleSavePlayer} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* チーム削除確認ダイアログ */}
      <Dialog
        open={!!confirmDeleteTeamId}
        onClose={handleCancelDeleteTeam}
      >
        <DialogTitle>チームを削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            このチームとそれに関連する選手データがすべて削除されます。この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteTeam}>キャンセル</Button>
          <Button onClick={handleDeleteTeam} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 選手削除確認ダイアログ */}
      <Dialog
        open={!!confirmDeletePlayerId}
        onClose={handleCancelDeletePlayer}
      >
        <DialogTitle>選手を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            選手データが削除されます。この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeletePlayer}>キャンセル</Button>
          <Button onClick={handleDeletePlayer} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TeamList; 