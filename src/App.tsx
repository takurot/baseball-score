import React, { useState, useEffect } from 'react';
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
  Divider,
  ListItemIcon,
  Drawer,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Select,
  FormControl,
  useMediaQuery,
  Hidden
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MenuIcon from '@mui/icons-material/Menu';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import GroupsIcon from '@mui/icons-material/Groups';
import BarChartIcon from '@mui/icons-material/BarChart';
import { v4 as uuidv4 } from 'uuid';
import { Team, Player, AtBat, Game, TeamSetting, RunEvent, RunEventType, OutEvent, OutEventType } from './types';
import TeamManager from './components/TeamManager';
import AtBatForm from './components/AtBatForm';
import AtBatHistory from './components/AtBatHistory';
import ScoreBoard from './components/ScoreBoard';
import AtBatSummaryTable from './components/AtBatSummaryTable';
import GameList from './components/GameList';
import TeamList from './components/TeamList';
import TeamStatsList from './components/TeamStatsList';
import { saveGame, getGameById, getSharedGameById, saveGameAsNew } from './firebase/gameService';
import { getUserTeams, getTeamById } from './firebase/teamService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import { analytics } from './firebase/config';
import { logEvent } from 'firebase/analytics';
import HelpDialog from './components/HelpDialog';
import HelpIcon from '@mui/icons-material/Help';

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
  name: '後攻チーム',
  players: [],
  atBats: []
};

const initialAwayTeam: Team = {
  id: uuidv4(),
  name: '先攻チーム',
  players: [],
  atBats: []
};

const initialGame: Game = {
  id: uuidv4(),
  date: new Date().toISOString().split('T')[0],
  homeTeam: initialHomeTeam,
  awayTeam: initialAwayTeam,
  currentInning: 1,
  venue: '', // 球場・場所
  tournament: '' // 大会名
};

// アナリティクスイベントを送信するヘルパー関数
const sendAnalyticsEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
    console.log(`Analytics event sent: ${eventName}`, eventParams);
  }
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
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  // チーム管理関連の状態
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [teamSelectionDialogOpen, setTeamSelectionDialogOpen] = useState(false);
  const [teamSelectionMode, setTeamSelectionMode] = useState<'home' | 'away'>('home');
  const [availableTeams, setAvailableTeams] = useState<TeamSetting[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // 通算成績関連の状態
  const [showTeamStats, setShowTeamStats] = useState(false);
  
  // メニュー関連の状態
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // 日付設定関連の状態
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  
  // 場所と大会名設定関連の状態
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  
  // 現在選択されているチーム
  const currentTeam = tabIndex === 0 ? game.awayTeam : game.homeTeam;
  
  // 打席結果の編集関連の状態
  const [editingAtBat, setEditingAtBat] = useState<AtBat | null>(null);

  // 共有された試合関連の状態
  const [isSharedMode, setIsSharedMode] = useState(false);
  const [sharedGameLoading, setSharedGameLoading] = useState(false);
  const [sharedGameError, setSharedGameError] = useState<string | null>(null);

  // ヘルプダイアログの状態
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // 打席登録ダイアログの状態
  const [atBatDialogOpen, setAtBatDialogOpen] = useState(false);

  // 得点追加ダイアログの状態
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runType, setRunType] = useState<RunEventType>('押し出し');
  const [runCount, setRunCount] = useState<number>(1);
  const [runNote, setRunNote] = useState('');

  // アウト追加ダイアログの状態
  const [outDialogOpen, setOutDialogOpen] = useState(false);
  const [outType, setOutType] = useState<OutEventType>('牽制アウト');
  const [outNote, setOutNote] = useState('');

  // レスポンシブデザイン用のメディアクエリ
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');

  // URLから共有されたゲームIDを取得
  useEffect(() => {
    const checkSharedGame = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedGameId = urlParams.get('gameId');
      
      if (sharedGameId) {
        console.log('Found gameId in URL:', sharedGameId);
        try {
          setSharedGameLoading(true);
          const sharedGame = await getSharedGameById(sharedGameId);
          if (sharedGame) {
            console.log('Successfully loaded shared game:', sharedGameId);
            setGame(sharedGame);
            setIsSharedMode(true);
            setViewMode('summary'); // 共有リンクでは自動的に一覧表示モードに
            setSharedGameError(null);
            
            // 共有モードの場合はアナリティクスイベントを送信
            sendAnalyticsEvent('shared_game_view', { 
              gameId: sharedGameId,
              gameTitle: `${sharedGame.awayTeam.name} vs ${sharedGame.homeTeam.name}`
            });
          } else {
            console.error('Game not found:', sharedGameId);
            setSharedGameError('指定された試合データが見つかりませんでした。');
          }
        } catch (error: any) {
          console.error('Error loading shared game:', error);
          setSharedGameError(error.message || '試合データの読み込みに失敗しました。');
        } finally {
          setSharedGameLoading(false);
        }
      } else {
        // 通常モードの場合はページビューイベントを送信
        sendAnalyticsEvent('page_view', { page_title: 'Home' });
      }
    };
    
    checkSharedGame();
  }, []);

  // ローディング中表示
  if (sharedGameLoading || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 共有リンクのエラー表示
  if (sharedGameError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 3 }}>
        <Typography variant="h5" color="error" gutterBottom>
          エラー
        </Typography>
        <Typography>{sharedGameError}</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={() => window.location.href = window.location.origin}
        >
          トップページに戻る
        </Button>
      </Box>
    );
  }

  // 共有モードでは認証不要
  if (!currentUser && !isSharedMode) {
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
      setGame({ ...game, awayTeam: updatedTeam });
    } else {
      setGame({ ...game, homeTeam: updatedTeam });
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
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
          atBats: updatedAtBats
        }
      });
    }
    setSelectedPlayer(null);
  };

  // 打席結果の編集ハンドラー
  const handleEditAtBat = (atBat: AtBat) => {
    setEditingAtBat(atBat);
    setAtBatDialogOpen(true); // 編集時もダイアログを開く
  };

  // 打席結果の更新ハンドラー
  const handleUpdateAtBat = (updatedAtBat: AtBat) => {
    const updatedAtBats = currentTeam.atBats.map(ab => 
      ab.id === updatedAtBat.id ? updatedAtBat : ab
    );
    
    if (tabIndex === 0) {
      setGame({
        ...game,
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
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
        awayTeam: {
          ...game.awayTeam,
          atBats: updatedAtBats
        }
      });
    } else {
      setGame({
        ...game,
        homeTeam: {
          ...game.homeTeam,
          atBats: updatedAtBats
        }
      });
    }
  };

  // 選手を打席登録するハンドラー
  const handleRegisterAtBat = (player: Player) => {
    setSelectedPlayer(player);
    setAtBatDialogOpen(true); // ダイアログを開く
  };

  // 打席登録ダイアログを閉じる
  const handleCloseAtBatDialog = () => {
    setAtBatDialogOpen(false);
    setSelectedPlayer(null);
  };

  // 試合一覧の表示/非表示切り替え
  const toggleGameList = () => {
    setShowGameList(!showGameList);
    
    // 他の画面を非表示にする
    if (showTeamManagement) {
      setShowTeamManagement(false);
    }
    
    // 通算成績画面が表示されている場合は閉じる
    if (showTeamStats) {
      setShowTeamStats(false);
    }
    
    handleMenuClose();
  };

  // チーム管理画面の表示/非表示切り替え
  const toggleTeamManagement = () => {
    setShowTeamManagement(!showTeamManagement);
  };

  // 通算成績画面の表示/非表示切り替え
  const toggleTeamStats = () => {
    setShowTeamStats(!showTeamStats);
    // 他の画面を非表示にする
    setShowGameList(false);
    setShowTeamManagement(false);
    handleMenuClose();
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
    // チーム管理画面が表示されている場合は閉じる
    if (showTeamManagement) {
      setShowTeamManagement(false);
    }
    // 通算成績画面が表示されている場合は閉じる
    if (showTeamStats) {
      setShowTeamStats(false);
    }
    // チーム選択ダイアログを表示せず、直接新しい試合画面に遷移
    // showTeamSelectionDialog();
  };

  // 表示モードの切り替え
  const toggleViewMode = () => {
    const newMode = viewMode === 'edit' ? 'summary' : 'edit';
    setViewMode(newMode);
    
    // アナリティクスイベント：表示モード切り替え
    sendAnalyticsEvent('view_mode_change', { mode: newMode });
  };

  // 保存ダイアログを開く
  const handleOpenSaveDialog = () => {
    setSaveDialogOpen(true);
  };
  
  // 保存ダイアログを閉じる
  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
  };

  // 試合データを保存する関数
  const handleSaveGame = async (saveAsNew: boolean = false) => {
    try {
      if (!currentUser) {
        setSnackbarOpen(true);
        setSnackbarMessage('ログインしてください');
        return;
      }

      // ゲームオブジェクトに最新のデータを設定
      const gameToSave = {
        ...game,
        lastUpdated: new Date().toISOString()
      };

      // Firestoreに保存
      let gameId: string;
      let message: string;
      
      if (saveAsNew) {
        // 新しい試合データとして保存
        gameId = await saveGameAsNew(gameToSave);
        setGame(prev => ({ ...prev, id: gameId }));
        message = '新しい試合データとして保存しました';
        
        // アナリティクスイベントを送信
        sendAnalyticsEvent('game_save_new', { 
          gameId,
          teams: `${game.awayTeam.name} vs ${game.homeTeam.name}`
        });
      } else {
        // 既存の試合データを更新または新規に保存
        gameId = await saveGame(gameToSave);
        if (!game.id) {
          setGame(prev => ({ ...prev, id: gameId }));
          // 新規保存の場合
          sendAnalyticsEvent('game_save_new', { 
            gameId,
            teams: `${game.awayTeam.name} vs ${game.homeTeam.name}`
          });
        } else {
          // 上書き保存の場合
          sendAnalyticsEvent('game_save_update', { 
            gameId,
            teams: `${game.awayTeam.name} vs ${game.homeTeam.name}`
          });
        }
        message = '試合データを保存しました';
      }

      setSnackbarOpen(true);
      setSnackbarMessage(message);
      
      // 最後に保存した試合のIDをローカルストレージに保存
      localStorage.setItem('lastGameId', gameId);
      
      // 保存ダイアログを閉じる
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Error saving game:', error);
      setSnackbarOpen(true);
      setSnackbarMessage(error instanceof Error ? `保存中にエラーが発生しました: ${error.message}` : '保存中に不明なエラーが発生しました');
      setSnackbarSeverity('error');
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
        
        // アナリティクスイベント：試合データ読み込み
        sendAnalyticsEvent('game_load', { 
          gameId,
          teams: `${loadedGame.awayTeam.name} vs ${loadedGame.homeTeam.name}`
        });
      }
    } catch (error: any) {
      console.error('Error loading game:', error);
      setSnackbarMessage(`読み込みに失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // チーム選択ダイアログを閉じる
  const closeTeamSelectionDialog = () => {
    setTeamSelectionDialogOpen(false);
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
      setSnackbarMessage(`${teamSetting.name}を${teamSelectionMode === 'home' ? '後攻' : '先攻'}チームに設定しました`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error('Failed to set team:', error);
      setSnackbarMessage(`チーム設定に失敗しました: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // 日付設定ダイアログを開く
  const handleOpenDateDialog = () => {
    setDateDialogOpen(true);
  };

  // 日付設定ダイアログを閉じる
  const handleCloseDateDialog = () => {
    setDateDialogOpen(false);
  };

  // 日付を更新する
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGame({
      ...game,
      date: event.target.value
    });
  };

  // 場所設定ダイアログを開く
  const handleOpenVenueDialog = () => {
    setVenueDialogOpen(true);
  };

  // 場所設定ダイアログを閉じる
  const handleCloseVenueDialog = () => {
    setVenueDialogOpen(false);
  };

  // 場所と大会名を更新する
  const handleVenueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGame({
      ...game,
      venue: event.target.value
    });
  };

  const handleTournamentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGame({
      ...game,
      tournament: event.target.value
    });
  };

  // ヘルプダイアログを開く
  const handleOpenHelpDialog = () => {
    setHelpDialogOpen(true);
    
    // アナリティクスイベント：ヘルプ表示
    sendAnalyticsEvent('help_view', { screen: 'main' });
  };

  // ヘルプダイアログを閉じる
  const handleCloseHelpDialog = () => {
    setHelpDialogOpen(false);
  };

  // 得点追加ダイアログを開く
  const handleOpenRunDialog = () => {
    setRunType('押し出し');
    setRunCount(1);
    setRunNote('');
    setRunDialogOpen(true);
  };
  
  // 得点追加ダイアログを閉じる
  const handleCloseRunDialog = () => {
    setRunDialogOpen(false);
  };
  
  // 得点追加の保存
  const handleSaveRun = () => {
    const newRunEvent: RunEvent = {
      id: uuidv4(),
      inning: game.currentInning,
      isTop: tabIndex === 0, // 常に現在のタブのチームに得点を追加
      runType: runType,
      runCount: runCount,
      note: runNote || undefined,
      timestamp: new Date()
    };
    
    // 現在のゲームに得点イベントを追加
    const updatedGame = { 
      ...game, 
      runEvents: [...(game.runEvents || []), newRunEvent] 
    };
    
    setGame(updatedGame);
    
    // Firebase Analyticsにイベントを送信
    sendAnalyticsEvent('add_run_event', {
      run_type: runType,
      run_count: runCount,
      inning: game.currentInning
    });
    
    handleCloseRunDialog();
  };

  // アウト追加ダイアログを開く
  const handleOpenOutDialog = () => {
    setOutType('牽制アウト');
    setOutNote('');
    setOutDialogOpen(true);
  };
  
  // アウト追加ダイアログを閉じる
  const handleCloseOutDialog = () => {
    setOutDialogOpen(false);
  };
  
  // アウト追加の保存
  const handleSaveOut = () => {
    const newOutEvent: OutEvent = {
      id: uuidv4(),
      inning: game.currentInning,
      isTop: tabIndex === 0, // 常に現在のタブのチームにアウトを追加
      outType: outType,
      note: outNote || undefined,
      timestamp: new Date()
    };
    
    // 現在のゲームにアウトイベントを追加
    const updatedGame = { 
      ...game, 
      outEvents: [...(game.outEvents || []), newOutEvent] 
    };
    
    setGame(updatedGame);
    
    // Firebase Analyticsにイベントを送信
    sendAnalyticsEvent('add_out_event', {
      out_type: outType,
      inning: game.currentInning
    });
    
    handleCloseOutDialog();
  };

  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ flexWrap: 'wrap', p: isMobile ? 1 : 2 }}>
          {!isSharedMode && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMenuOpen}
              size={isMobile ? "small" : "medium"}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center',
              fontSize: isSmallMobile ? '0.9rem' : undefined
            }}
            noWrap
          >
            <SportsBaseballIcon sx={{ mr: 0.5, fontSize: isMobile ? '1.1rem' : '1.5rem' }} />
            野球スコア {isSharedMode && '(共有モード)'}
          </Typography>
          
          {!isSharedMode ? (
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center',
              '& > button': { 
                fontSize: isMobile ? '0.7rem' : undefined,
                minWidth: isMobile ? 'auto' : undefined,
                p: isMobile ? '4px 8px' : undefined
              }
            }}>
              <Hidden smDown>
                <Button 
                  color="inherit" 
                  onClick={handleOpenDateDialog}
                  sx={{ mr: 1 }}
                >
                  {new Date(game.date).toLocaleDateString('ja-JP')}
                </Button>
              </Hidden>
              
              <Button 
                color="inherit" 
                startIcon={!isMobile && <SaveIcon />}
                onClick={handleOpenSaveDialog}
                sx={{ mr: isMobile ? 0.5 : 1 }}
              >
                {isMobile ? '保存' : '保存'}
              </Button>
              
              <Button 
                color="inherit" 
                onClick={toggleViewMode}
                sx={{ mr: isMobile ? 0.5 : 1 }}
              >
                {viewMode === 'edit' ? (isMobile ? '一覧' : '一覧表示') : (isMobile ? '編集' : '編集に戻る')}
              </Button>
              
              <IconButton
                color="inherit"
                onClick={handleOpenHelpDialog}
                aria-label="help"
                title="ヘルプ"
                size={isMobile ? "small" : "medium"}
                sx={{ mr: isMobile ? 0.5 : 0 }}
              >
                <HelpIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
              
              <UserProfile />
            </Box>
          ) : (
            // 共有モードでのボタン
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                onClick={handleOpenHelpDialog}
                aria-label="help"
                title="ヘルプ"
                sx={{ mr: 1 }}
                size={isMobile ? "small" : "medium"}
              >
                <HelpIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
              <Button 
                color="inherit" 
                onClick={() => window.location.href = window.location.origin}
                sx={{ 
                  fontSize: isMobile ? '0.7rem' : undefined,
                  p: isMobile ? '4px 8px' : undefined
                }}
              >
                {isMobile ? 'ホーム' : 'アプリに戻る'}
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* モバイル表示のみの日付ボタン（AppBarの下に配置） */}
      {!isSharedMode && isMobile && (
        <Box sx={{ 
          backgroundColor: '#f5f5f5', 
          p: 1, 
          textAlign: 'center',
          borderBottom: '1px solid #e0e0e0' 
        }}>
          <Button 
            size="small"
            onClick={handleOpenDateDialog}
            startIcon={<span style={{ fontSize: '0.8rem' }}>📅</span>}
            sx={{ fontSize: '0.8rem' }}
          >
            {new Date(game.date).toLocaleDateString('ja-JP')}
          </Button>
        </Box>
      )}
      
      <Container sx={{ pt: 2 }}>
        {/* 画面の優先順位: チーム管理画面 > 通算成績 > ゲーム一覧 > 通常の試合画面 */}
        {showTeamManagement && !isSharedMode ? (
          <TeamList />
        ) : showTeamStats && !isSharedMode ? (
          <TeamStatsList />
        ) : showGameList && !isSharedMode ? (
          <GameList 
            onSelectGame={handleSelectGame} 
            onGameDeleted={() => {
              setSnackbarMessage('試合データを削除しました');
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            }}
          />
        ) : (
          <>
            {/* 場所と大会名の表示 */}
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                mb: 2,
                cursor: isSharedMode ? 'default' : 'pointer' 
              }}
              onClick={!isSharedMode ? handleOpenVenueDialog : undefined}
            >
              <Typography variant="subtitle1" align="center">
                {game.tournament ? game.tournament : isSharedMode ? '' : '大会名をクリックして設定'} 
                {game.venue && ` @ ${game.venue}`}
              </Typography>
            </Box>
            
            <ScoreBoard 
              homeTeam={game.homeTeam} 
              awayTeam={game.awayTeam} 
              currentInning={game.currentInning} 
              runEvents={game.runEvents || []}
            />
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabIndex} onChange={handleTabChange}>
                <Tab label={game.awayTeam.name} />
                <Tab label={game.homeTeam.name} />
              </Tabs>
            </Box>

            {viewMode === 'summary' || isSharedMode ? (
              // 打席結果一覧表示モード
              <AtBatSummaryTable 
                team={currentTeam} 
                maxInning={game.currentInning}
                outEvents={game.outEvents}
              />
            ) : (
              // 編集モード（共有モードでは表示しない）
              <>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {game.currentInning}回
                  </Typography>
                  <Box>
                    <Button 
                      variant="outlined"
                      color="secondary"
                      onClick={handleOpenRunDialog}
                      sx={{ mr: 1 }}
                    >
                      得点追加
                    </Button>
                    <Button 
                      variant="outlined"
                      color="error"
                      onClick={handleOpenOutDialog}
                      sx={{ mr: 2 }}
                    >
                      アウト追加
                    </Button>
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
                </Box>
                
                <TeamManager 
                  team={currentTeam} 
                  onTeamUpdate={handleTeamUpdate} 
                  onRegisterAtBat={handleRegisterAtBat}
                />
                
                <AtBatHistory 
                  atBats={currentTeam.atBats} 
                  players={currentTeam.players}
                  inning={game.currentInning}
                  runEvents={game.runEvents}
                  outEvents={game.outEvents}
                  onEditAtBat={handleEditAtBat}
                  onDeleteAtBat={handleDeleteAtBat}
                  onDeleteRunEvent={(eventId) => {
                    const updatedRunEvents = (game.runEvents || []).filter(event => event.id !== eventId);
                    setGame({
                      ...game,
                      runEvents: updatedRunEvents
                    });
                  }}
                  onDeleteOutEvent={(eventId) => {
                    const updatedOutEvents = (game.outEvents || []).filter(event => event.id !== eventId);
                    setGame({
                      ...game,
                      outEvents: updatedOutEvents
                    });
                  }}
                  currentTeamName={currentTeam.name}
                  opposingTeamName={tabIndex === 0 ? game.homeTeam.name : game.awayTeam.name}
                />

                {/* 打席登録ダイアログ */}
                <Dialog 
                  open={atBatDialogOpen} 
                  onClose={handleCloseAtBatDialog}
                  maxWidth="md"
                  fullWidth
                >
                  <DialogTitle>
                    {editingAtBat ? "打席結果の編集" : "打席結果の登録"}
                  </DialogTitle>
                  <DialogContent>
                    <AtBatForm 
                      player={selectedPlayer} 
                      inning={game.currentInning}
                      onAddAtBat={(atBat) => {
                        handleAddAtBat(atBat);
                        handleCloseAtBatDialog();
                      }}
                      editingAtBat={editingAtBat}
                      onUpdateAtBat={(updatedAtBat) => {
                        handleUpdateAtBat(updatedAtBat);
                        handleCloseAtBatDialog();
                      }}
                      onCancelEdit={() => {
                        handleCancelEdit();
                        handleCloseAtBatDialog();
                      }}
                    />
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseAtBatDialog} color="inherit">閉じる</Button>
                  </DialogActions>
                </Dialog>
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
            {game.tournament && (
              <Typography variant="body2">
                大会名: {game.tournament}
              </Typography>
            )}
            {game.venue && (
              <Typography variant="body2">
                場所: {game.venue}
              </Typography>
            )}
            <Typography variant="body2">
              対戦: {game.awayTeam.name} vs {game.homeTeam.name}
            </Typography>
            {game.id && (
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                ※この試合はすでに保存されています
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>キャンセル</Button>
          {game.id && (
            <>
              <Button onClick={() => handleSaveGame(false)} color="primary">
                上書き保存
              </Button>
              <Button onClick={() => handleSaveGame(true)} color="secondary">
                新規保存
              </Button>
            </>
          )}
          {!game.id && (
            <Button onClick={() => handleSaveGame()} color="primary">
              保存
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* 日付設定ダイアログ */}
      <Dialog open={dateDialogOpen} onClose={handleCloseDateDialog}>
        <DialogTitle>試合日を設定</DialogTitle>
        <DialogContent>
          <TextField
            label="日付"
            type="date"
            value={game.date}
            onChange={handleDateChange}
            fullWidth
            margin="normal"
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDateDialog}>キャンセル</Button>
          <Button onClick={handleCloseDateDialog} color="primary">
            設定
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 場所と大会名設定ダイアログ */}
      <Dialog open={venueDialogOpen} onClose={handleCloseVenueDialog}>
        <DialogTitle>場所と大会名を設定</DialogTitle>
        <DialogContent>
          <TextField
            label="大会名"
            type="text"
            value={game.tournament || ''}
            onChange={handleTournamentChange}
            fullWidth
            margin="normal"
            placeholder="例: ○○リーグ戦"
          />
          <TextField
            label="球場・場所"
            type="text"
            value={game.venue || ''}
            onChange={handleVenueChange}
            fullWidth
            margin="normal"
            placeholder="例: ○○グラウンド"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVenueDialog}>キャンセル</Button>
          <Button onClick={handleCloseVenueDialog} color="primary">
            設定
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
          {teamSelectionMode === 'home' ? '後攻' : '先攻'}チームを選択
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
      {menuOpen && !isSharedMode && (
        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleNewGame}>
            <ListItemIcon>
              <SportsBaseballIcon fontSize="small" />
            </ListItemIcon>
            新しい試合
          </MenuItem>
          <MenuItem onClick={toggleGameList}>
            <ListItemIcon>
              <SportsBaseballIcon fontSize="small" />
            </ListItemIcon>
            試合一覧を表示
          </MenuItem>
          <MenuItem onClick={toggleTeamManagement}>
            <ListItemIcon>
              <GroupsIcon fontSize="small" />
            </ListItemIcon>
            チーム・選手管理
          </MenuItem>
          <MenuItem onClick={toggleTeamStats}>
            <ListItemIcon>
              <BarChartIcon fontSize="small" />
            </ListItemIcon>
            通算成績
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setHelpDialogOpen(true)}>
            <ListItemIcon>
              <HelpIcon fontSize="small" />
            </ListItemIcon>
            ヘルプ
          </MenuItem>
        </Menu>
      )}
      
      {/* スナックバー通知 */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={snackbarSeverity === 'info' ? null : 6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* ヘルプダイアログ */}
      <HelpDialog open={helpDialogOpen} onClose={handleCloseHelpDialog} />
      
      {/* 得点追加ダイアログ */}
      <Dialog open={runDialogOpen} onClose={handleCloseRunDialog}>
        <DialogTitle>
          {tabIndex === 0 ? game.awayTeam.name : game.homeTeam.name}の得点追加
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>得点タイプ</InputLabel>
            <Select
              value={runType}
              onChange={(e) => setRunType(e.target.value as RunEventType)}
              label="得点タイプ"
            >
              <MenuItem value="押し出し">押し出し四球/死球</MenuItem>
              <MenuItem value="ワイルドピッチ">ワイルドピッチ</MenuItem>
              <MenuItem value="パスボール">パスボール</MenuItem>
              <MenuItem value="盗塁">盗塁（エラー含む）</MenuItem>
              <MenuItem value="投手エラー">投手エラー（ボーク等）</MenuItem>
              <MenuItem value="その他">その他</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>得点数</InputLabel>
            <Select
              value={runCount}
              onChange={(e) => setRunCount(Number(e.target.value))}
              label="得点数"
            >
              <MenuItem value={1}>1点</MenuItem>
              <MenuItem value={2}>2点</MenuItem>
              <MenuItem value={3}>3点</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            {tabIndex === 0 ? game.awayTeam.name : game.homeTeam.name}の{game.currentInning}回の得点として記録します
          </Typography>
          
          <TextField
            label="メモ（任意）"
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2 }}
            value={runNote}
            onChange={(e) => setRunNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRunDialog}>キャンセル</Button>
          <Button onClick={handleSaveRun} variant="contained" color="primary">追加</Button>
        </DialogActions>
      </Dialog>

      {/* アウト追加ダイアログ */}
      <Dialog open={outDialogOpen} onClose={handleCloseOutDialog}>
        <DialogTitle>
          {tabIndex === 0 ? game.awayTeam.name : game.homeTeam.name}のアウト追加
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>アウトタイプ</InputLabel>
            <Select
              value={outType}
              onChange={(e) => setOutType(e.target.value as OutEventType)}
              label="アウトタイプ"
            >
              <MenuItem value="牽制アウト">牽制アウト</MenuItem>
              <MenuItem value="盗塁死">盗塁死</MenuItem>
              <MenuItem value="タッチアウト">タッチアウト</MenuItem>
              <MenuItem value="フォースアウト">フォースアウト</MenuItem>
              <MenuItem value="飛球失策">飛球失策</MenuItem>
              <MenuItem value="打順間違い">打順間違い</MenuItem>
              <MenuItem value="その他">その他</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            {tabIndex === 0 ? game.awayTeam.name : game.homeTeam.name}の{game.currentInning}回のアウトとして記録します
          </Typography>
          
          <TextField
            label="メモ（任意）"
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2 }}
            value={outNote}
            onChange={(e) => setOutNote(e.target.value)}
            placeholder="例: 二塁ランナーが三塁への進塁時にタッチアウト"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOutDialog}>キャンセル</Button>
          <Button onClick={handleSaveOut} variant="contained" color="error">追加</Button>
        </DialogActions>
      </Dialog>
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
