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
  MenuItem
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MenuIcon from '@mui/icons-material/Menu';
import { v4 as uuidv4 } from 'uuid';
import { Team, Player, AtBat, Game } from './types';
import TeamManager from './components/TeamManager';
import AtBatForm from './components/AtBatForm';
import AtBatHistory from './components/AtBatHistory';
import ScoreBoard from './components/ScoreBoard';
import AtBatSummaryTable from './components/AtBatSummaryTable';
import GameList from './components/GameList';
import { saveGame, getGameById } from './firebase/gameService';

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

function App() {
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
  
  // メニュー関連の状態
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // 現在選択されているチーム
  const currentTeam = tabIndex === 0 ? game.homeTeam : game.awayTeam;
  
  // 打席結果の編集関連の状態
  const [editingAtBat, setEditingAtBat] = useState<AtBat | null>(null);

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
    
    // 選手選択をリセット
    setSelectedPlayer(null);
  };

  // 打席登録用に選手を選択
  const handleRegisterAtBat = (playerId: string) => {
    const player = currentTeam.players.find(p => p.id === playerId);
    if (player && player.isActive) {
      setSelectedPlayer(player);
    }
  };

  // 表示モード切り替え
  const toggleViewMode = () => {
    setViewMode(viewMode === 'edit' ? 'summary' : 'edit');
  };
  
  // 日付変更ハンドラー
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGame({ ...game, date: event.target.value });
  };
  
  // 試合保存ダイアログを開く
  const handleOpenSaveDialog = () => {
    setSaveDialogOpen(true);
  };
  
  // 試合保存ダイアログを閉じる
  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
  };
  
  // 試合を保存
  const handleSaveGame = async () => {
    try {
      // Firebaseに保存
      const gameId = await saveGame(game);
      console.log('Game saved with ID:', gameId);
      
      // 成功メッセージを表示
      setSnackbarMessage('試合データを保存しました');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // ダイアログを閉じる
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Failed to save game:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setSnackbarMessage(`試合データの保存に失敗しました: ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // 試合一覧の表示/非表示を切り替え
  const toggleGameList = () => {
    setShowGameList(!showGameList);
  };
  
  // 試合を選択して読み込む
  const handleSelectGame = async (gameId: string) => {
    try {
      const loadedGame = await getGameById(gameId);
      if (loadedGame) {
        setGame(loadedGame);
        setShowGameList(false);
        setSnackbarMessage('試合データを読み込みました');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      setSnackbarMessage('試合データの読み込みに失敗しました');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // 新しい試合を開始
  const handleNewGame = () => {
    setGame({
      ...initialGame,
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0]
    });
    setMenuAnchorEl(null);
  };
  
  // メニューを開く
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  // メニューを閉じる
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 打席結果編集ハンドラー
  const handleEditAtBat = (atBat: AtBat) => {
    setEditingAtBat(atBat);
    // 編集対象の選手を選択状態にする
    const player = currentTeam.players.find(p => p.id === atBat.playerId);
    if (player) {
      setSelectedPlayer(player);
    }
  };
  
  // 打席結果更新ハンドラー
  const handleUpdateAtBat = (updatedAtBat: AtBat) => {
    const updatedAtBats = currentTeam.atBats.map(atBat => 
      atBat.id === updatedAtBat.id ? updatedAtBat : atBat
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
    
    // 編集状態をリセット
    setEditingAtBat(null);
    setSelectedPlayer(null);
    
    // 成功メッセージを表示
    setSnackbarMessage('打席結果を更新しました');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // 打席結果削除ハンドラー
  const handleDeleteAtBat = (atBatId: string) => {
    const updatedAtBats = currentTeam.atBats.filter(atBat => atBat.id !== atBatId);
    
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
    
    // 成功メッセージを表示
    setSnackbarMessage('打席結果を削除しました');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // 編集キャンセルハンドラー
  const handleCancelEdit = () => {
    setEditingAtBat(null);
    setSelectedPlayer(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            野球スコアアプリ
          </Typography>
          <TextField
            type="date"
            value={game.date}
            onChange={handleDateChange}
            variant="outlined"
            size="small"
            sx={{ 
              mr: 2, 
              bgcolor: 'white', 
              borderRadius: 1,
              width: '150px'
            }}
          />
          <Button 
            color="inherit" 
            onClick={toggleViewMode}
            sx={{ mr: 1 }}
          >
            {viewMode === 'edit' ? '一覧表示' : '編集モード'}
          </Button>
          <Button 
            color="inherit" 
            startIcon={<SaveIcon />}
            onClick={handleOpenSaveDialog}
          >
            保存
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* 試合一覧 */}
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
      
      {/* メニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleNewGame}>新しい試合</MenuItem>
        <MenuItem onClick={() => { toggleGameList(); handleMenuClose(); }}>
          試合一覧を{showGameList ? '非表示' : '表示'}
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
    </ThemeProvider>
  );
}

export default App;
