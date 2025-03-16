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
  ListItemSecondaryAction
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAllGames, deleteGame } from '../firebase/gameService';
import { Game } from '../types';

interface GameListProps {
  onSelectGame: (gameId: string) => void;
  onGameDeleted?: () => void;
}

const GameList: React.FC<GameListProps> = ({ onSelectGame, onGameDeleted }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);

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
      weekday: 'short'
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
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={(e) => handleOpenDeleteDialog(game.id, e)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => onSelectGame(game.id)}>
                <ListItemText
                  primary={`${game.awayTeam.name} vs ${game.homeTeam.name}`}
                  secondary={formatDate(game.date)}
                />
              </ListItemButton>
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
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
    </Paper>
  );
};

export default GameList; 