import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import { Player } from '../types';

// 打席登録ボタンの id プレフィックス。次打者へフォーカスを進める際に使う
export const registerAtBatButtonId = (playerId: string): string =>
  `register-atbat-${playerId}`;

interface PlayerListProps {
  players: Player[];
  onRegisterAtBat?: (player: Player) => void;
  onToggleStatus?: (playerId: string) => void;
  onEditPlayer?: (playerId: string) => void;
  onUpdatePlayerOrder?: (playerId: string, order: number) => void;
  nextBatterPlayerId?: string | null;
}

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  onRegisterAtBat,
  onToggleStatus,
  onEditPlayer,
  onUpdatePlayerOrder,
  nextBatterPlayerId = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // playersが未定義またはnullの場合は空配列を使用
  const playersList = players || [];

  // 打順でソート
  const sortedPlayers = [...playersList].sort((a, b) => a.order - b.order);

  // 出場中の選手と控えの選手を分ける
  const activePlayers = sortedPlayers.filter((player) => player.isActive);
  const benchPlayers = sortedPlayers.filter((player) => !player.isActive);

  // 打順変更ハンドラー
  const handleOrderChange = (
    playerId: string,
    event: SelectChangeEvent<number>
  ) => {
    if (onUpdatePlayerOrder) {
      const newOrder = Number(event.target.value);
      onUpdatePlayerOrder(playerId, newOrder);
    }
  };

  // 打順選択用の選択肢を生成（1～9）
  const orderOptions = Array.from({ length: 9 }, (_, i) => i + 1);

  // 打順セレクトまたは読み取り専用表示のレンダラー
  const renderOrderControl = (
    player: Player,
    minHeight?: number,
    minWidth?: number
  ) => {
    if (onUpdatePlayerOrder) {
      return (
        <FormControl
          size="small"
          sx={{ minWidth: minWidth ?? (isMobile ? 80 : 65) }}
        >
          <Select
            value={player.order === 0 ? '' : player.order}
            onChange={(e: SelectChangeEvent<number>) =>
              handleOrderChange(player.id, e)
            }
            displayEmpty
            aria-label={`${player.name}の打順`}
            sx={minHeight ? { minHeight } : undefined}
          >
            <MenuItem value="">
              <em>未設定</em>
            </MenuItem>
            {orderOptions.map((order) => (
              <MenuItem key={order} value={order}>
                {order}番
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (isMobile) {
      return (
        <Chip
          size="small"
          label={player.order === 0 ? '未設定' : `${player.order}番`}
        />
      );
    }
    return player.order || '未設定';
  };

  // 選手情報編集ボタンのレンダラー
  const renderEditButton = (playerId: string, isLarge?: boolean) => {
    if (!onEditPlayer) return null;
    return (
      <Tooltip title="選手情報を編集">
        <IconButton
          size={isLarge ? 'medium' : 'small'}
          onClick={() => onEditPlayer(playerId)}
          aria-label="選手情報を編集"
          sx={isLarge ? { minHeight: 48, minWidth: 48 } : undefined}
        >
          <EditIcon fontSize={isLarge ? 'medium' : 'small'} />
        </IconButton>
      </Tooltip>
    );
  };

  if (isMobile) {
    return (
      <Box sx={{ mb: 3 }}>
        {/* 出場中の選手セクション */}
        <Typography
          variant="subtitle1"
          sx={{
            px: 2,
            py: 1,
            fontWeight: 'bold',
            bgcolor: 'action.hover',
            borderRadius: 1,
            mb: 1.5,
          }}
        >
          出場中の選手
        </Typography>

        {activePlayers.length > 0 ? (
          activePlayers.map((player) => {
            const isNextBatter = player.id === nextBatterPlayerId;
            return (
              <Paper
                key={player.id}
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 1.5,
                  ...(isNextBatter && {
                    borderColor: 'primary.main',
                    bgcolor: 'action.selected',
                  }),
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      #{player.number} {player.name}
                    </Typography>
                    {isNextBatter && (
                      <Chip
                        label="次打者"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      label={player.position}
                      size="small"
                      variant="filled"
                    />
                  </Box>

                  {renderOrderControl(player, 48, 80)}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {onRegisterAtBat && (
                    <Button
                      id={registerAtBatButtonId(player.id)}
                      variant="contained"
                      onClick={() => onRegisterAtBat(player)}
                      color="primary"
                      startIcon={<AssignmentIcon />}
                      sx={{ minHeight: 48, minWidth: 48, flex: 1 }}
                    >
                      打席登録
                    </Button>
                  )}
                  {onToggleStatus && (
                    <Button
                      variant="outlined"
                      onClick={() => onToggleStatus(player.id)}
                      color="secondary"
                      startIcon={<PersonOffIcon />}
                      sx={{ minHeight: 48, minWidth: 48 }}
                    >
                      控えに
                    </Button>
                  )}
                  {renderEditButton(player.id, true)}
                </Box>
              </Paper>
            );
          })
        ) : (
          <Paper variant="outlined" sx={{ p: 2, mb: 1.5, textAlign: 'center' }}>
            <Typography color="text.secondary">
              出場中の選手がいません
            </Typography>
          </Paper>
        )}

        {/* 控えの選手セクション */}
        {benchPlayers.length > 0 && (
          <>
            <Typography
              variant="subtitle1"
              sx={{
                px: 2,
                py: 1,
                mt: 2,
                mb: 1.5,
                fontWeight: 'bold',
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              控えの選手
            </Typography>
            {benchPlayers.map((player) => (
              <Paper
                key={player.id}
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 1.5,
                  bgcolor: 'action.hover',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      #{player.number} {player.name}
                    </Typography>
                    <Chip
                      label={player.position}
                      size="small"
                      variant="filled"
                    />
                  </Box>

                  {renderOrderControl(player, 48, 80)}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {onToggleStatus && (
                    <Button
                      variant="outlined"
                      onClick={() => onToggleStatus(player.id)}
                      color="success"
                      startIcon={<PersonIcon />}
                      sx={{ minHeight: 48, minWidth: 48, flex: 1 }}
                    >
                      出場させる
                    </Button>
                  )}
                  {renderEditButton(player.id, true)}
                </Box>
              </Paper>
            ))}
          </>
        )}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      {/* 出場中の選手 */}
      <Typography
        variant="subtitle1"
        sx={{ px: 2, py: 1, fontWeight: 'bold', bgcolor: 'action.hover' }}
      >
        出場中の選手
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>打順</TableCell>
            <TableCell>背番号</TableCell>
            <TableCell>名前</TableCell>
            <TableCell>ポジション</TableCell>
            <TableCell>アクション</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activePlayers.length > 0 ? (
            activePlayers.map((player) => {
              const isNextBatter = player.id === nextBatterPlayerId;
              return (
                <TableRow
                  key={player.id}
                  selected={isNextBatter}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    ...(isNextBatter && {
                      backgroundColor: 'action.selected',
                    }),
                  }}
                >
                  <TableCell>
                    {renderOrderControl(player, undefined, 65)}
                  </TableCell>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      {player.name}
                      {isNextBatter && (
                        <Chip
                          label="次打者"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        alignItems: 'center',
                      }}
                    >
                      {onRegisterAtBat && (
                        <Button
                          id={registerAtBatButtonId(player.id)}
                          variant="outlined"
                          size="small"
                          onClick={() => onRegisterAtBat(player)}
                          color="primary"
                          startIcon={<AssignmentIcon fontSize="small" />}
                          sx={{ minHeight: 40 }}
                        >
                          打席登録
                        </Button>
                      )}
                      {onToggleStatus && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onToggleStatus(player.id)}
                          color="secondary"
                          startIcon={<PersonOffIcon fontSize="small" />}
                          sx={{ minHeight: 40 }}
                        >
                          控えに
                        </Button>
                      )}
                      {renderEditButton(player.id)}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                出場中の選手がいません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 控えの選手 */}
      {benchPlayers.length > 0 && (
        <>
          <Typography
            variant="subtitle1"
            sx={{
              px: 2,
              py: 1,
              mt: 2,
              fontWeight: 'bold',
              bgcolor: 'action.hover',
            }}
          >
            控えの選手
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>打順</TableCell>
                <TableCell>背番号</TableCell>
                <TableCell>名前</TableCell>
                <TableCell>ポジション</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {benchPlayers.map((player) => (
                <TableRow
                  key={player.id}
                  sx={{
                    backgroundColor: 'action.hover',
                    '&:hover': { backgroundColor: 'action.selected' },
                  }}
                >
                  <TableCell>
                    {renderOrderControl(player, undefined, 65)}
                  </TableCell>
                  <TableCell>{player.number}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.position}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        alignItems: 'center',
                      }}
                    >
                      {onToggleStatus && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onToggleStatus(player.id)}
                          color="success"
                          startIcon={<PersonIcon fontSize="small" />}
                          sx={{ minHeight: 40 }}
                        >
                          出場させる
                        </Button>
                      )}
                      {renderEditButton(player.id)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </TableContainer>
  );
};

export default PlayerList;
