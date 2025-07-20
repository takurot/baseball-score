import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Switch,
  Tooltip,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PublicIcon from '@mui/icons-material/Public';
import PublicOffIcon from '@mui/icons-material/PublicOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  getAllGames,
  deleteGame,
  updateGamePublicStatus,
} from '../firebase/gameService';
import { Game } from '../types';

interface GameListProps {
  onSelectGame: (gameId: string) => void;
  onGameDeleted?: () => void;
  onShareGame?: (gameId: string) => void;
}

const GameList: React.FC<GameListProps> = ({
  onSelectGame,
  onGameDeleted,
  onShareGame,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [updatingPublicStatus, setUpdatingPublicStatus] = useState<
    string | null
  >(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const gameData = await getAllGames();
      setGames(gameData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch games:', err);
      setError('試合データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // 削除ダイアログを開く
  const handleOpenDeleteDialog = (gameId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setGameToDelete(gameId);
    setDeleteDialogOpen(true);
  };

  // 削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setGameToDelete(null);
  };

  // 試合を削除する
  const handleDeleteGame = async () => {
    if (!gameToDelete) return;

    try {
      await deleteGame(gameToDelete);
      // 削除後にリストを更新
      await fetchGames();
      // 親コンポーネントに通知
      if (onGameDeleted) {
        onGameDeleted();
      }
      setDeleteDialogOpen(false);
      setGameToDelete(null);
    } catch (err) {
      console.error('Failed to delete game:', err);
      setError('試合データの削除に失敗しました。');
    }
  };

  // 公開状態の切り替え
  const handleTogglePublic = async (
    gameId: string,
    currentPublicStatus: boolean,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    try {
      setUpdatingPublicStatus(gameId);
      await updateGamePublicStatus(gameId, !currentPublicStatus);
      // 状態を更新
      setGames(
        games.map((game) =>
          game.id === gameId
            ? { ...game, isPublic: !currentPublicStatus }
            : game
        )
      );
    } catch (err) {
      console.error('Failed to update public status:', err);
      setError('公開設定の更新に失敗しました。');
    } finally {
      setUpdatingPublicStatus(null);
    }
  };

  // 共有URLを直接表示
  const handleShowShareUrl = (gameId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // 共有URLを生成
    const url = `${window.location.origin}?gameId=${gameId}`;
    setShareUrl(url);
    setShareUrlDialogOpen(true);
  };

  // URLをクリップボードにコピー
  const handleCopyToClipboard = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      alert('URLをクリップボードにコピーしました');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
    }
  };

  // シェアボタンのクリックハンドラー
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleShareGame = (gameId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onShareGame) {
      onShareGame(gameId);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  if (games.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography>保存された試合はありません。</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        保存された試合一覧
      </Typography>
      <List>
        {games.map((game, index) => (
          <React.Fragment key={game.id}>
            {index > 0 && <Divider />}
            <ListItem
              disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title={game.isPublic ? '公開中' : '非公開'}>
                    <span>
                      <Switch
                        checked={Boolean(game.isPublic)}
                        onChange={(e) => {}}
                        onClick={(e) =>
                          handleTogglePublic(game.id, Boolean(game.isPublic), e)
                        }
                        disabled={updatingPublicStatus === game.id}
                        color="primary"
                        size="small"
                        icon={<PublicOffIcon />}
                        checkedIcon={<PublicIcon />}
                      />
                    </span>
                  </Tooltip>

                  {game.isPublic && (
                    <Tooltip title="共有URLを表示">
                      <IconButton
                        aria-label="copy share link"
                        onClick={(e) => handleShowShareUrl(game.id, e)}
                        size="small"
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => handleOpenDeleteDialog(game.id, e)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemButton onClick={() => onSelectGame(game.id)}>
                <ListItemText
                  primary={
                    <Box>
                      <Typography
                        variant={isMobile ? 'body1' : 'h6'}
                        component="div"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: isMobile ? '1.1rem' : '1.25rem',
                          lineHeight: 1.2,
                          mb: isMobile ? 0.5 : 0,
                        }}
                      >
                        {game.awayTeam.name} vs {game.homeTeam.name}
                      </Typography>
                      {isMobile && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: '0.9rem', lineHeight: 1.3 }}
                        >
                          {formatDate(game.date)}
                          {game.tournament && ` | ${game.tournament}`}
                          {game.venue && ` @ ${game.venue}`}
                          {game.currentInning && ` | ${game.currentInning}回`}
                          {game.isPublic && ' | 公開中'}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    !isMobile ? (
                      <>
                        {formatDate(game.date)}
                        {game.tournament && ` | ${game.tournament}`}
                        {game.venue && ` @ ${game.venue}`}
                        {game.currentInning && ` | ${game.currentInning}回`}
                        {game.isPublic && ' | 公開中'}
                      </>
                    ) : null
                  }
                />
              </ListItemButton>
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>試合データの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この試合データを削除しますか？この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
          <Button onClick={handleDeleteGame} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 共有URL表示ダイアログ */}
      <Dialog
        open={shareUrlDialogOpen}
        onClose={() => setShareUrlDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>共有URL</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            以下のURLを共有することで、この試合結果を他の人に共有できます。
          </Typography>

          <TextField
            value={shareUrl}
            fullWidth
            variant="outlined"
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleCopyToClipboard}
            color="primary"
          >
            URLをコピー
          </Button>
          <Button onClick={() => setShareUrlDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GameList;
