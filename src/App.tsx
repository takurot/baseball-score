import React, { useState } from 'react';
import { 
  Container, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Button, 
  ButtonGroup,
  ThemeProvider,
  createTheme,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MenuIcon from '@mui/icons-material/Menu';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import GroupsIcon from '@mui/icons-material/Groups';
import { v4 as uuidv4 } from 'uuid';
import { Team, Player, AtBat, Game, TeamSetting } from './types';
import TeamManager from './components/TeamManager';
import AtBatForm from './components/AtBatForm';
import AtBatHistory from './components/AtBatHistory';
import ScoreBoard from './components/ScoreBoard';
import AtBatSummaryTable from './components/AtBatSummaryTable';
import GameList from './components/GameList';
import TeamList from './components/TeamList';
import { saveGame, getGameById } from './firebase/gameService';
import { getUserTeams, getTeamById } from './firebase/teamService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import UserProfile from './components/UserProfile';

// テーマの作成
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// 初期データ
const initialHomeTeam: Team = {
  id: uuidv4(),
  name: 'ホームチーム',
  players: [],
  atBats: []
};

const initialAwayTeam: Team = {
  id: uuidv4(),
  name: 'アウェイチーム',
  players: [],
  atBats: []
};

const initialGame: Game = {
  id: uuidv4(),
  date: new Date().toISOString().split('T')[0],
  homeTeam: initialHomeTeam,
  awayTeam: initialAwayTeam,
  currentInning: 1
};

// アプリのメインコンテンツコンポーネント
const MainApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [game, setGame] = useState<Game>(initialGame);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'summary'>('edit');
  
  // 試合保存・読み込み関連の状態
  const [showGameList, setShowGameList] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // チーム管理関連の状態
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [teamSelectionDialogOpen, setTeamSelectionDialogOpen] = useState(false);
  const [teamSelectionMode, setTeamSelectionMode] = useState<'home' | 'away'>('home');
  const [availableTeams, setAvailableTeams] = useState<TeamSetting[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // メニュー関連の状態
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // 現在選択されているチーム
  const currentTeam = tabIndex === 0 ? game.homeTeam : game.awayTeam;
  
  // 打席結果の編集関連の状態
  const [editingAtBat, setEditingAtBat] = useState<AtBat | null>(null);

  // ローディング中表示
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 未ログイン時はログイン画面を表示
  if (!currentUser) {
    return <Login />;
  }

  // タブ変更ハンドラー
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setSelectedPlayer(null);
  };

  // イニング変更ハンドラー
  const handleInningChange = (increment: number) => {
    // 少年野球なので最大7回まで
    const maxInning = 7;
    const newInning = Math.max(1, Math.min(maxInning, game.currentInning + increment));
    setGame({ ...game, currentInning: newInning });
  };

  // チーム更新ハンドラー
  const handleTeamUpdate = (updatedTeam: Team) => {
    if (tabIndex === 0) {
      setGame({ ...game, homeTeam: updatedTeam });
    } else {
      setGame({ ...game, awayTeam: updatedTeam });
    }
    
    // 選手が更新された場合、選択中の選手も更新する
    if (selectedPlayer) {
      const updatedPlayer = updatedTeam.players.find(p => p.id === selectedPlayer.id);
      setSelectedPlayer(updatedPlayer || null);
    }
  };

  // 打席結果追加ハンドラー
  const handleAddAtBat = (atBat: AtBat) => {
    const updatedAtBats = [...currentTeam.atBats, atBat];
    
    if (tabIndex === 0) {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    }
    setSelectedPlayer(null);
  };

  // 打席結果の編集ハンドラー
  const handleEditAtBat = (atBat: AtBat) => {
    setEditingAtBat(atBat);
  };

  // 打席結果の更新ハンドラー
  const handleUpdateAtBat = (updatedAtBat: AtBat) => {
    const updatedAtBats = currentTeam.atBats.map(ab => 
      ab.id === updatedAtBat.id ? updatedAtBat : ab
    );
    
    if (tabIndex === 0) {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    }
    
    setEditingAtBat(null);
  };

  // 打席結果の編集キャンセルハンドラー
  const handleCancelEdit = () => {
    setEditingAtBat(null);
  };

  // 打席結果の削除ハンドラー
  const handleDeleteAtBat = (atBatId: string) => {
    const updatedAtBats = currentTeam.atBats.filter(ab => ab.id !== atBatId);
    
    if (tabIndex === 0) {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    }
  };

  // 選手を打席登録するハンドラー
  const handleRegisterAtBat = (player: Player) => {
    setSelectedPlayer(player);
  };

  // 試合一覧の表示/非表示切り替え
  const toggleGameList = () => {
    setShowGameList(!showGameList);
  };

  // チーム管理画面の表示/非表示切り替え
  const toggleTeamManagement = () => {
    setShowTeamManagement(!showTeamManagement);
  };

  // メニューを開く
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // メニューを閉じる
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 新しい試合を作成
  const handleNewGame = () => {
    setGame(initialGame);
    handleMenuClose();
    showTeamSelectionDialog();
  };

  // 表示モードの切り替え
  const toggleViewMode = () => {
    setViewMode(viewMode === 'edit' ? 'summary' : 'edit');
  };

  // 保存ダイアログを開く
  const handleOpenSaveDialog = () => {
    setSaveDialogOpen(true);
  };

  // 保存ダイアログを閉じる
  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
  };

  // 試合データを保存
  const handleSaveGame = async () => {
    try {
      const gameId = await saveGame(game);
      setSaveDialogOpen(false);
      setSnackbarMessage('試合データを保存しました');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // IDを更新
      setGame({
        ...game,
        id: gameId
      });
    } catch (error: any) {
      console.error('Error saving game:', error);
      setSnackbarMessage(`保存に失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // 既存の試合データを選択
  const handleSelectGame = async (gameId: string) => {
    try {
      const loadedGame = await getGameById(gameId);
      if (loadedGame) {
        setGame(loadedGame);
        setSnackbarMessage('試合データを読み込みました');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setShowGameList(false);
      }
    } catch (error: any) {
      console.error('Error loading game:', error);
      setSnackbarMessage(`読み込みに失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // チーム選択ダイアログを表示
  const showTeamSelectionDialog = async () => {
    try {
      setLoadingTeams(true);
      const teams = await getUserTeams();
      setAvailableTeams(teams);
      setTeamSelectionDialogOpen(true);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  // チーム選択ダイアログを閉じる
  const closeTeamSelectionDialog = () => {
    setTeamSelectionDialogOpen(false);
  };

  // チーム選択モードを設定（ホームかアウェイか）
  const setTeamSelection = (mode: 'home' | 'away') => {
    setTeamSelectionMode(mode);
    showTeamSelectionDialog();
  };

  // 選択したチームをゲームに設定
  const handleSelectTeamForGame = async (teamSettingId: string) => {
    try {
      const teamSetting = await getTeamById(teamSettingId);
      if (!teamSetting) {
        throw new Error('チームデータの取得に失敗しました');
      }
      
      // 保存済みのチーム情報からゲーム用のチームデータを作成
      const gameTeam: Team = {
        id: teamSetting.id,
        name: teamSetting.name,
        players: teamSetting.players.map(player => ({
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position,
          isActive: true,
          order: 0 // 初期値は0に設定
        })),
        atBats: []
      };
      
      // ホームチームかアウェイチームのどちらを更新するか
      if (teamSelectionMode === 'home') {
        setGame(prevGame => ({
          ...prevGame,
          homeTeam: gameTeam
        }));
      } else {
        setGame(prevGame => ({
          ...prevGame,
          awayTeam: gameTeam
        }));
      }
      
      closeTeamSelectionDialog();
      setSnackbarMessage(`${teamSetting.name}を${teamSelectionMode === 'home' ? 'ホーム' : 'アウェイ'}チームに設定しました`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error('Failed to set team:', error);
      setSnackbarMessage(`チーム設定に失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <SportsBaseballIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            野球スコア
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<SaveIcon />}
            onClick={handleOpenSaveDialog}
          >
            保存
          </Button>
          <Button 
            color="inherit" 
            onClick={toggleViewMode}
          >
            {viewMode === 'edit' ? '一覧表示' : '編集に戻る'}
          </Button>
          <UserProfile />
        </Toolbar>
      </AppBar>
      
      <Container sx={{ pt: 2 }}>
        {/* チーム管理画面 */}
        {showTeamManagement ? (
          <TeamList 
            onSelectTeam={(teamId) => {
              handleSelectTeamForGame(teamId);
              toggleTeamManagement(); // チーム選択後はチーム管理画面を閉じる
            }}
          />
        ) : (
          <>
            {/* ゲーム一覧 */}
            {showGameList && (
              <GameList 
                onSelectGame={handleSelectGame} 
                onGameDeleted={() => {
                  setSnackbarMessage('試合データを削除しました');
                  setSnackbarSeverity('success');
                  setSnackbarOpen(true);
                }}
              />
            )}
            
            <ScoreBoard 
              homeTeam={game.homeTeam} 
              awayTeam={game.awayTeam} 
              currentInning={game.currentInning} 
            />
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabIndex} onChange={handleTabChange}>
                <Tab label={game.homeTeam.name} />
                <Tab label={game.awayTeam.name} />
              </Tabs>
            </Box>

            {viewMode === 'summary' ? (
              // 打席結果一覧表示モード
              <AtBatSummaryTable 
                team={currentTeam} 
                maxInning={game.currentInning}
              />
            ) : (
              // 編集モード
              <>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {game.currentInning}回
                  </Typography>
                  <ButtonGroup>
                    <Button 
                      onClick={() => handleInningChange(-1)}
                      disabled={game.currentInning <= 1}
                    >
                      前の回
                    </Button>
                    <Button 
                      onClick={() => handleInningChange(1)}
                    >
                      次の回
                    </Button>
                  </ButtonGroup>
                </Box>
                
                <TeamManager 
                  team={currentTeam} 
                  onTeamUpdate={handleTeamUpdate} 
                  onRegisterAtBat={handleRegisterAtBat}
                />
                
                <AtBatForm 
                  player={selectedPlayer} 
                  inning={game.currentInning}
                  onAddAtBat={handleAddAtBat}
                  editingAtBat={editingAtBat}
                  onUpdateAtBat={handleUpdateAtBat}
                  onCancelEdit={handleCancelEdit}
                />
                
                <AtBatHistory 
                  atBats={currentTeam.atBats} 
                  players={currentTeam.players}
                  inning={game.currentInning}
                  onEditAtBat={handleEditAtBat}
                  onDeleteAtBat={handleDeleteAtBat}
                />
              </>
            )}
          </>
        )}
      </Container>
      
      {/* 試合保存ダイアログ */}
      <Dialog open={saveDialogOpen} onClose={handleCloseSaveDialog}>
        <DialogTitle>試合データを保存</DialogTitle>
        <DialogContent>
          <Typography>
            現在の試合データを保存しますか？
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              日付: {new Date(game.date).toLocaleDateString('ja-JP')}
            </Typography>
            <Typography variant="body2">
              対戦: {game.awayTeam.name} vs {game.homeTeam.name}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>キャンセル</Button>
          <Button onClick={handleSaveGame} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* チーム選択ダイアログ */}
      <Dialog 
        open={teamSelectionDialogOpen} 
        onClose={closeTeamSelectionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {teamSelectionMode === 'home' ? 'ホーム' : 'アウェイ'}チームを選択
        </DialogTitle>
        <DialogContent>
          {loadingTeams ? (
            <Box display="flex" justifyContent="center" padding={3}>
              <CircularProgress />
            </Box>
          ) : availableTeams.length === 0 ? (
            <Typography>
              登録済みのチームがありません。先に「チーム・選手管理」からチームを作成してください。
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {availableTeams.map(team => (
                <Button 
                  key={team.id}
                  variant="outlined"
                  onClick={() => handleSelectTeamForGame(team.id)}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <Box>
                    <Typography variant="subtitle1">{team.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      選手数: {team.players?.length || 0}人
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTeamSelectionDialog}>キャンセル</Button>
        </DialogActions>
      </Dialog>
      
      {/* メニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleNewGame}>新しい試合</MenuItem>
        <MenuItem onClick={() => { setTeamSelection('home'); handleMenuClose(); }}>
          ホームチームを選択
        </MenuItem>
        <MenuItem onClick={() => { setTeamSelection('away'); handleMenuClose(); }}>
          アウェイチームを選択
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { toggleGameList(); handleMenuClose(); }}>
          試合一覧を{showGameList ? '非表示' : '表示'}
        </MenuItem>
        <MenuItem onClick={() => { toggleTeamManagement(); handleMenuClose(); }}>
          <GroupsIcon sx={{ mr: 1, fontSize: '1.25rem' }} />
          チーム・選手管理
        </MenuItem>
      </Menu>
      
      {/* スナックバー通知 */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

// アプリケーションのルートコンポーネント
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
