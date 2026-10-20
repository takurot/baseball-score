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
  Box,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  PersonAdd as PersonAddIcon,
  SportsCricket as SportsCricketIcon,
} from '@mui/icons-material';
import { TeamSetting, PlayerSetting } from '../types';
import {
  getUserTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
  updatePlayerInTeam,
  removePlayerFromTeam,
} from '../firebase/teamService';
import { useAuth } from '../contexts/AuthContext';
import { generateDefaultPlayers } from '../utils/defaultPlayers';

const TeamList: React.FC = () => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState<TeamSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チーム関連の状態
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(
    null
  );
  const [teamDialogError, setTeamDialogError] = useState<string | null>(null);

  // 選手関連の状態
  const [openPlayerDialog, setOpenPlayerDialog] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');
  const [confirmDeletePlayerId, setConfirmDeletePlayerId] = useState<
    string | null
  >(null);
  const [playerDialogError, setPlayerDialogError] = useState<string | null>(
    null
  );

  // アコーディオンの開閉状態
  const [expandedAccordions, setExpandedAccordions] = useState<
    Record<string, boolean>
  >({});

  // アコーディオンの開閉を管理
  const handleAccordionChange =
    (teamId: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordions((prev) => ({
        ...prev,
        [teamId]: isExpanded,
      }));
    };

  // チームデータの読み込み - useCallbackでメモ化
  const loadTeams = useCallback(
    async (isInitial = false) => {
      if (!currentUser) return;

      try {
        if (isInitial) {
          setLoading(true);
        }
        setError(null);
        const teamsData = await getUserTeams();
        setTeams(teamsData || []);
      } catch (err: unknown) {
        console.error('Failed to load teams:', err);
        setError(
          'チームデータの読み込みに失敗しました: ' +
            (err instanceof Error ? err.message : 'エラーが発生しました')
        );
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    },
    [currentUser]
  );

  // 初回読み込み
  useEffect(() => {
    loadTeams(true);
  }, [loadTeams]);

  // チームダイアログの内部リセット
  const resetTeamDialogState = () => {
    setOpenTeamDialog(false);
    setTeamName('');
    setEditingTeamId(null);
    setTeamDialogError(null);
  };

  // チーム追加・編集ダイアログを開く
  const handleOpenTeamDialog = (team?: TeamSetting) => {
    setTeamDialogError(null);
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
    resetTeamDialogState();
  };

  // チーム追加・編集を保存
  const handleSaveTeam = async () => {
    const trimmedTeamName = teamName.trim();
    if (!trimmedTeamName) {
      setTeamDialogError('チーム名を入力してください');
      return;
    }

    setTeamDialogError(null);

    if (editingTeamId) {
      // 既存チームの更新（楽観的更新）
      const targetTeamId = editingTeamId;
      const originalTeam = teams.find((t) => t.id === targetTeamId);
      const prevName = originalTeam?.name || '';

      // ローカル state を即座に更新し、ダイアログを閉じる
      setTeams((prev) =>
        prev.map((t) =>
          t.id === targetTeamId ? { ...t, name: trimmedTeamName } : t
        )
      );
      resetTeamDialogState();

      // バックグラウンドでサーバーへ保存
      updateTeam(targetTeamId, { name: trimmedTeamName }).catch(
        (err: unknown) => {
          console.error('Failed to update team:', err);
          // 失敗時はロールバック
          setTeams((prev) =>
            prev.map((t) =>
              t.id === targetTeamId ? { ...t, name: prevName } : t
            )
          );
          setError(
            'チームの更新に失敗しました: ' +
              (err instanceof Error ? err.message : 'エラーが発生しました')
          );
        }
      );
    } else {
      // 新規チーム作成（楽観的更新）
      const tempTeamId = 'temp-' + crypto.randomUUID();
      const defaultPlayers = generateDefaultPlayers().map(
        ({ id, name, number, position }) => ({ id, name, number, position })
      );

      const optimisticTeam: TeamSetting = {
        id: tempTeamId,
        name: trimmedTeamName,
        players: defaultPlayers,
        userId: currentUser?.uid || '',
        userEmail: currentUser?.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // ローカル state を即座に更新し、ダイアログを閉じる
      setTeams((prev) => [...prev, optimisticTeam]);
      resetTeamDialogState();

      // バックグラウンドでサーバーへ保存
      createTeam({ name: trimmedTeamName, players: defaultPlayers })
        .then((newId) => {
          // 成功時は仮IDを本IDに差し替え
          setTeams((prev) =>
            prev.map((t) => (t.id === tempTeamId ? { ...t, id: newId } : t))
          );
        })
        .catch((err: unknown) => {
          console.error('Failed to create team:', err);
          // 失敗時はロールバック（仮チームを除外）
          setTeams((prev) => prev.filter((t) => t.id !== tempTeamId));
          setError(
            'チームの保存に失敗しました: ' +
              (err instanceof Error ? err.message : 'エラーが発生しました')
          );
        });
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

    const targetTeamId = confirmDeleteTeamId;
    const teamIndex = teams.findIndex((t) => t.id === targetTeamId);
    const targetTeam = teams[teamIndex];

    // 即座に一覧から除外し、ダイアログを閉じる
    setTeams((prev) => prev.filter((t) => t.id !== targetTeamId));
    setConfirmDeleteTeamId(null);

    // バックグラウンドで削除処理を実行
    deleteTeam(targetTeamId).catch((err: unknown) => {
      console.error('Failed to delete team:', err);
      // 失敗時は元の位置にロールバック
      if (targetTeam) {
        setTeams((prev) => {
          const next = [...prev];
          next.splice(teamIndex, 0, targetTeam);
          return next;
        });
      }
      setError(
        'チームの削除に失敗しました: ' +
          (err instanceof Error ? err.message : 'エラーが発生しました')
      );
    });
  };

  // 選手ダイアログの内部リセット
  const resetPlayerDialogState = () => {
    setOpenPlayerDialog(false);
    setCurrentTeamId(null);
    setPlayerName('');
    setPlayerNumber('');
    setPlayerPosition('');
    setEditingPlayerId(null);
    setPlayerDialogError(null);
  };

  // 選手追加・編集ダイアログを開く
  const handleOpenPlayerDialog = (teamId: string, player?: PlayerSetting) => {
    setCurrentTeamId(teamId);
    setPlayerDialogError(null);

    // アコーディオンを開く状態に設定
    setExpandedAccordions((prev) => ({
      ...prev,
      [teamId]: true,
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
    resetPlayerDialogState();
  };

  // 選手追加・編集を保存
  const handleSavePlayer = async () => {
    if (!currentTeamId) return;

    const trimmedPlayerName = playerName.trim();
    if (!trimmedPlayerName) {
      setPlayerDialogError('選手名を入力してください');
      return;
    }

    setPlayerDialogError(null);

    const targetTeamId = currentTeamId;
    const playerData = {
      name: trimmedPlayerName,
      number: playerNumber.trim(),
      position: playerPosition.trim(),
    };

    if (editingPlayerId) {
      // 既存選手の更新（楽観的更新）
      const targetPlayerId = editingPlayerId;
      const currentTeam = teams.find((t) => t.id === targetTeamId);
      const originalPlayer = currentTeam?.players.find(
        (p) => p.id === targetPlayerId
      );

      // 即座にローカル一覧を更新し、ダイアログを閉じる
      setTeams((prev) =>
        prev.map((t) =>
          t.id === targetTeamId
            ? {
                ...t,
                players: t.players.map((p) =>
                  p.id === targetPlayerId ? { ...p, ...playerData } : p
                ),
              }
            : t
        )
      );
      resetPlayerDialogState();

      // バックグラウンドで更新
      updatePlayerInTeam(targetTeamId, targetPlayerId, playerData).catch(
        (err: unknown) => {
          console.error('Failed to update player:', err);
          // 失敗時は元の選手データにロールバック
          if (originalPlayer) {
            setTeams((prev) =>
              prev.map((t) =>
                t.id === targetTeamId
                  ? {
                      ...t,
                      players: t.players.map((p) =>
                        p.id === targetPlayerId ? originalPlayer : p
                      ),
                    }
                  : t
              )
            );
          }
          setError(
            '選手の保存に失敗しました: ' +
              (err instanceof Error ? err.message : 'エラーが発生しました')
          );
        }
      );
    } else {
      // 新規選手追加（楽観的更新）
      const newPlayerId = crypto.randomUUID();
      const optimisticPlayer: PlayerSetting = {
        id: newPlayerId,
        ...playerData,
        createdAt: new Date().toISOString(),
      };

      // 即座にローカル一覧に追加し、ダイアログを閉じる
      setTeams((prev) =>
        prev.map((t) =>
          t.id === targetTeamId
            ? { ...t, players: [...t.players, optimisticPlayer] }
            : t
        )
      );
      resetPlayerDialogState();

      // 現在のチームのアコーディオンは開いたままにする
      setExpandedAccordions((prev) => ({
        ...prev,
        [targetTeamId]: true,
      }));

      // バックグラウンドでサーバーへ保存
      addPlayerToTeam(targetTeamId, {
        id: newPlayerId,
        ...playerData,
      }).catch((err: unknown) => {
        console.error('Failed to add player:', err);
        // 失敗時はロールバック
        setTeams((prev) =>
          prev.map((t) =>
            t.id === targetTeamId
              ? {
                  ...t,
                  players: t.players.filter((p) => p.id !== newPlayerId),
                }
              : t
          )
        );
        setError(
          '選手の保存に失敗しました: ' +
            (err instanceof Error ? err.message : 'エラーが発生しました')
        );
      });
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

    const targetTeamId = currentTeamId;
    const targetPlayerId = confirmDeletePlayerId;
    const currentTeam = teams.find((t) => t.id === targetTeamId);
    const playerIndex =
      currentTeam?.players.findIndex((p) => p.id === targetPlayerId) ?? -1;
    const targetPlayer = currentTeam?.players[playerIndex];

    // 即座にローカル一覧から除外し、ダイアログを閉じる
    setTeams((prev) =>
      prev.map((t) =>
        t.id === targetTeamId
          ? {
              ...t,
              players: t.players.filter((p) => p.id !== targetPlayerId),
            }
          : t
      )
    );
    setConfirmDeletePlayerId(null);

    // バックグラウンドで削除処理を実行
    removePlayerFromTeam(targetTeamId, targetPlayerId).catch((err: unknown) => {
      console.error('Failed to delete player:', err);
      // 失敗時は元の位置にロールバック
      if (targetPlayer && playerIndex !== -1) {
        setTeams((prev) =>
          prev.map((t) => {
            if (t.id !== targetTeamId) return t;
            const nextPlayers = [...t.players];
            nextPlayers.splice(playerIndex, 0, targetPlayer);
            return { ...t, players: nextPlayers };
          })
        );
      }
      setError(
        '選手の削除に失敗しました: ' +
          (err instanceof Error ? err.message : 'エラーが発生しました')
      );
    });
  };

  // チーム・選手一覧（統合後のメインリスト）
  const renderTeamList = () => {
    if (teams.length === 0) {
      return (
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ my: 4, textAlign: 'center' }}
        >
          チームがまだ登録されていません。「新しいチームを作成」ボタンをクリックして、チームを追加してください。
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
              <Typography variant="h6" component="h3">
                {team.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mb: 1.5,
                  gap: 1,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenTeamDialog(team)}
                  aria-label="チーム名を編集"
                >
                  チーム名を編集
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleConfirmDeleteTeam(team.id)}
                  aria-label="チームを削除"
                >
                  チームを削除
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle1" color="text.secondary">
                  所属選手 ({team.players?.length || 0}人)
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleOpenPlayerDialog(team.id)}
                  size="small"
                >
                  選手を追加
                </Button>
              </Box>

              {!team.players || team.players.length === 0 ? (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ py: 2, textAlign: 'center' }}
                >
                  選手が登録されていません。「選手を追加」ボタンから登録してください。
                </Typography>
              ) : (
                <List disablePadding>
                  {team.players.map((player) => (
                    <React.Fragment key={player.id}>
                      <ListItem sx={{ px: 1 }}>
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
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => {
                              setCurrentTeamId(team.id);
                              handleConfirmDeletePlayer(player.id);
                            }}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
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
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>チーム情報を読み込み中...</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <SportsCricketIcon sx={{ mr: 1 }} />
          チームと選手の管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenTeamDialog()}
        >
          新しいチームを作成
        </Button>
      </Box>

      {renderTeamList()}

      {/* チーム追加・編集ダイアログ */}
      <Dialog open={openTeamDialog} onClose={handleCloseTeamDialog}>
        <DialogTitle>
          {editingTeamId ? 'チーム情報を編集' : '新しいチームを作成'}
        </DialogTitle>
        <DialogContent>
          {teamDialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {teamDialogError}
            </Alert>
          )}
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
        <DialogTitle>
          {editingPlayerId ? '選手情報を編集' : '新しい選手を追加'}
        </DialogTitle>
        <DialogContent>
          {playerDialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {playerDialogError}
            </Alert>
          )}
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
      <Dialog open={!!confirmDeleteTeamId} onClose={handleCancelDeleteTeam}>
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
      <Dialog open={!!confirmDeletePlayerId} onClose={handleCancelDeletePlayer}>
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
