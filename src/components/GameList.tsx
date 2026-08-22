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
  Snackbar,
  Alert,
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
}

const GameList: React.FC<GameListProps> = ({ onSelectGame, onGameDeleted }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [shareUrlDialogOpen, setShareUrlDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [updatingPublicStatus, setUpdatingPublicStatus] = useState<Set<string>>(
    new Set()
  );

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
      setActionError(null);
      await deleteGame(gameToDelete);
      setGames((prev) => prev.filter((game) => game.id !== gameToDelete));
      // 親コンポーネントに通知
      if (onGameDeleted) {
        onGameDeleted();
      }
      setDeleteDialogOpen(false);
      setGameToDelete(null);
    } catch (err) {
      console.error('Failed to delete game:', err);
      setActionError('試合データの削除に失敗しました。');
    }
  };

  // 公開状態の切り替え
  const handleTogglePublic = async (
    gameId: string,
    nextPublicStatus: boolean,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    try {
      setActionError(null);
      setUpdatingPublicStatus((prev) => new Set(prev).add(gameId));
      await updateGamePublicStatus(gameId, nextPublicStatus);
      // 状態を更新
      setGames((prev) =>
        prev.map((game) =>
          game.id === gameId ? { ...game, isPublic: nextPublicStatus } : game
        )
      );
    } catch (err) {
      console.error('Failed to update public status:', err);
      setActionError('公開設定の更新に失敗しました。');
    } finally {
      setUpdatingPublicStatus((prev) => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
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
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('URLをクリップボードにコピーしました');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
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
                        onChange={(event, checked) =>
                          handleTogglePublic(game.id, checked, event)
                        }
                        disabled={updatingPublicStatus.has(game.id)}
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
                          {game.currentInning > 0
                            ? ` | ${game.currentInning}回`
                            : ''}
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
                        {game.currentInning > 0
                          ? ` | ${game.currentInning}回`
                          : ''}
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

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={6000}
        onClose={() => setActionError(null)}
      >
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default GameList;
