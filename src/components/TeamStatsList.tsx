import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  getAllTeamStats,
  TeamStats,
  MIN_QUALIFYING_AT_BATS,
} from '../firebase/statsService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

// 打撃成績のキーと表示ラベルを一箇所にまとめ、各表示箇所（チーム/選手 ×
// モバイル/デスクトップ）で使い回す。値は team.battingStats / player の
// どちらも同じキーで参照できる（PlayerBattingStats は BattingStats を継承）
type StatKey =
  | 'gameCount'
  | 'atBats'
  | 'hits'
  | 'doubles'
  | 'triples'
  | 'homeRuns'
  | 'rbis'
  | 'walks'
  | 'strikeouts'
  | 'battingAvg'
  | 'obp'
  | 'slg'
  | 'ops';

interface StatFieldConfig {
  label: string;
  shortLabel?: string;
  isRate?: boolean;
}

const STAT_FIELDS: Record<StatKey, StatFieldConfig> = {
  gameCount: { label: '試合数', shortLabel: '試合' },
  atBats: { label: '打数' },
  hits: { label: '安打' },
  doubles: { label: '二塁打', shortLabel: '2B' },
  triples: { label: '三塁打', shortLabel: '3B' },
  homeRuns: { label: '本塁打', shortLabel: 'HR' },
  rbis: { label: '打点' },
  walks: { label: '四死球' },
  strikeouts: { label: '三振' },
  battingAvg: { label: '打率', isRate: true },
  obp: { label: '出塁率', isRate: true },
  slg: { label: '長打率', isRate: true },
  ops: { label: 'OPS', isRate: true },
};

// テーブル・カードで並べる順序（各表示箇所は必要なキーだけを部分的に使う）
// gameCount は BattingStats に含まれず team.battingStats / player どちらでも
// 別枠で扱うため、ここでは除外した型にする
type BattingStatKey = Exclude<StatKey, 'gameCount'>;

const DESKTOP_TABLE_ORDER: BattingStatKey[] = [
  'atBats',
  'hits',
  'doubles',
  'triples',
  'homeRuns',
  'rbis',
  'walks',
  'strikeouts',
  'battingAvg',
  'obp',
  'slg',
  'ops',
];

const TEAM_MOBILE_ORDER: StatKey[] = [
  'battingAvg',
  'gameCount',
  'atBats',
  'hits',
  'homeRuns',
  'rbis',
  'walks',
  'strikeouts',
  'obp',
  'slg',
  'ops',
];

const PLAYER_MOBILE_ORDER: StatKey[] = [
  'gameCount',
  'atBats',
  'hits',
  'doubles',
  'triples',
  'homeRuns',
  'rbis',
  'walks',
  'strikeouts',
  'obp',
  'slg',
  'ops',
];

// 打率などをフォーマット
const formatBattingAvg = (value: number): string => {
  return value.toFixed(3).replace(/^0+/, '');
};

const formatStatValue = (key: StatKey, value: number): string =>
  STAT_FIELDS[key].isRate ? formatBattingAvg(value) : String(value);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
};

const TeamStatsList: React.FC = () => {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 成績をフェッチ
  useEffect(() => {
    let cancelled = false;

    const fetchTeamStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const stats = await getAllTeamStats();
        if (cancelled) return;

        const safeStats = Array.isArray(stats) ? stats : [];
        setTeamStats(safeStats);
        // 最初のチームが選択された状態にする
        if (safeStats.length > 0) {
          setSelectedTeamId(safeStats[0].teamId);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Error fetching team stats:', err);
        setError(`成績の取得に失敗しました: ${getErrorMessage(err)}`);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTeamStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 選択中のチーム（一覧が変化しても存在しないIDを指し続けない）
  const selectedTeam =
    teamStats?.find((team) => team.teamId === selectedTeamId) ?? null;

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          チーム成績を読み込み中...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (teamStats.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">チーム成績がありません</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            試合データを登録すると、チームごとの通算成績が表示されます。
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        チーム通算成績
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : undefined}
        >
          <Tab label="チーム成績" />
          <Tab label="打撃成績" />
          <Tab label="個人成績" />
        </Tabs>
      </Box>

      {/* チーム成績タブ */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell>チーム名</TableCell>
                <TableCell align="center">試合数</TableCell>
                <TableCell align="center">勝</TableCell>
                <TableCell align="center">負</TableCell>
                <TableCell align="center">分</TableCell>
                <TableCell align="center">勝率</TableCell>
                <TableCell align="center">得点</TableCell>
                <TableCell align="center">失点</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamStats.map((stats) => (
                <TableRow key={stats.teamId}>
                  <TableCell component="th" scope="row">
                    {stats.teamName}
                  </TableCell>
                  <TableCell align="center">{stats.gameCount}</TableCell>
                  <TableCell align="center">{stats.wins}</TableCell>
                  <TableCell align="center">{stats.losses}</TableCell>
                  <TableCell align="center">{stats.draws}</TableCell>
                  <TableCell align="center">
                    {stats.wins + stats.losses > 0
                      ? formatBattingAvg(
                          stats.wins / (stats.wins + stats.losses)
                        )
                      : '.000'}
                  </TableCell>
                  <TableCell align="center">{stats.totalRuns}</TableCell>
                  <TableCell align="center">{stats.totalRunsAllowed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* チーム打撃成績タブ */}
      <TabPanel value={tabValue} index={1}>
        {isMobile ? (
          // モバイル向け表示
          <Box>
            {teamStats.map((stats) => (
              <Card key={stats.teamId} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {stats.teamName}
                  </Typography>
                  {TEAM_MOBILE_ORDER.map((key) => (
                    <Typography variant="body2" key={key}>
                      {STAT_FIELDS[key].label}:{' '}
                      {formatStatValue(
                        key,
                        key === 'gameCount'
                          ? stats.gameCount
                          : stats.battingStats[key]
                      )}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          // デスクトップ向け表示
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>チーム名</TableCell>
                  <TableCell align="center">試合数</TableCell>
                  {DESKTOP_TABLE_ORDER.map((key) => (
                    <TableCell align="center" key={key}>
                      {STAT_FIELDS[key].label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {teamStats.map((stats) => (
                  <TableRow key={stats.teamId}>
                    <TableCell component="th" scope="row">
                      {stats.teamName}
                    </TableCell>
                    <TableCell align="center">{stats.gameCount}</TableCell>
                    {DESKTOP_TABLE_ORDER.map((key) => (
                      <TableCell align="center" key={key}>
                        {formatStatValue(key, stats.battingStats[key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* 個人成績タブ */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            チームを選択
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {teamStats.map((team) => (
              <Button
                key={team.teamId}
                variant={
                  selectedTeamId === team.teamId ? 'contained' : 'outlined'
                }
                onClick={() => setSelectedTeamId(team.teamId)}
                sx={{ mb: 1 }}
              >
                {team.teamName}
              </Button>
            ))}
          </Box>
        </Box>

        {selectedTeam && (
          <>
            <Typography
              variant="h6"
              sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center' }}
            >
              {selectedTeam.teamName}の選手成績
              <Tooltip
                title={`規定打数（${MIN_QUALIFYING_AT_BATS}打数以上）に到達した選手を上位表示しています。`}
              >
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>

            {isMobile ? (
              // モバイル向け表示 - アコーディオン形式
              <Box>
                {selectedTeam.playerStats.length === 0 ? (
                  <Alert severity="info">選手の打撃成績はまだありません</Alert>
                ) : (
                  selectedTeam.playerStats.map((player) => (
                    <Accordion key={player.playerId} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <Typography>
                            {player.playerNumber} {player.playerName}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ ml: 2, fontWeight: 'bold' }}
                          >
                            打率 {formatBattingAvg(player.battingAvg)}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1,
                          }}
                        >
                          {PLAYER_MOBILE_ORDER.map((key) => (
                            <Typography variant="body2" key={key}>
                              {STAT_FIELDS[key].label}:{' '}
                              {formatStatValue(key, player[key])}
                            </Typography>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Box>
            ) : (
              // デスクトップ向け表示 - テーブル形式
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="60px">#</TableCell>
                      <TableCell sx={{ minWidth: '140px', width: '140px' }}>
                        名前
                      </TableCell>
                      <TableCell align="center">試合</TableCell>
                      {DESKTOP_TABLE_ORDER.map((key) => (
                        <TableCell align="center" key={key}>
                          {STAT_FIELDS[key].shortLabel ??
                            STAT_FIELDS[key].label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTeam.playerStats.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3 + DESKTOP_TABLE_ORDER.length}
                          align="center"
                        >
                          選手の打撃成績はまだありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedTeam.playerStats.map((player) => (
                        <TableRow
                          key={player.playerId}
                          sx={{
                            backgroundColor:
                              player.atBats >= MIN_QUALIFYING_AT_BATS
                                ? 'rgba(232, 244, 253, 0.3)'
                                : 'inherit',
                          }}
                        >
                          <TableCell>{player.playerNumber}</TableCell>
                          <TableCell sx={{ minWidth: '140px', width: '140px' }}>
                            {player.playerName}
                          </TableCell>
                          <TableCell align="center">
                            {player.gameCount}
                          </TableCell>
                          {DESKTOP_TABLE_ORDER.map((key) => (
                            <TableCell
                              align="center"
                              key={key}
                              sx={
                                key === 'battingAvg'
                                  ? { fontWeight: 'bold' }
                                  : undefined
                              }
                            >
                              {formatStatValue(key, player[key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </TabPanel>
    </Container>
  );
};

export default TeamStatsList;
