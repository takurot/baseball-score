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
  Alert
} from '@mui/material';
import { getAllTeamStats, TeamStats } from '../firebase/statsService';

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
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TeamStatsList: React.FC = () => {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 成績をフェッチ
  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const stats = await getAllTeamStats();
        setTeamStats(stats);
      } catch (err: any) {
        console.error('Error fetching team stats:', err);
        setError(`成績の取得に失敗しました: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 打率などをフォーマット
  const formatBattingAvg = (value: number): string => {
    return value.toFixed(3).replace(/^0+/, '');
  };

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
          <Typography variant="h6">
            チーム成績がありません
          </Typography>
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
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : undefined}
        >
          <Tab label="チーム成績" />
          <Tab label="打撃成績" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table size={isMobile ? "small" : "medium"}>
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
                      ? (stats.wins / (stats.wins + stats.losses)).toFixed(3).substring(1) 
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
                  <Typography variant="body2">
                    打率: {formatBattingAvg(stats.battingStats.battingAvg)}
                  </Typography>
                  <Typography variant="body2">
                    試合数: {stats.gameCount}
                  </Typography>
                  <Typography variant="body2">
                    打数: {stats.battingStats.atBats}
                  </Typography>
                  <Typography variant="body2">
                    安打: {stats.battingStats.hits}
                  </Typography>
                  <Typography variant="body2">
                    本塁打: {stats.battingStats.homeRuns}
                  </Typography>
                  <Typography variant="body2">
                    打点: {stats.battingStats.rbis}
                  </Typography>
                  <Typography variant="body2">
                    四死球: {stats.battingStats.walks}
                  </Typography>
                  <Typography variant="body2">
                    三振: {stats.battingStats.strikeouts}
                  </Typography>
                  <Typography variant="body2">
                    出塁率: {formatBattingAvg(stats.battingStats.obp)}
                  </Typography>
                  <Typography variant="body2">
                    長打率: {formatBattingAvg(stats.battingStats.slg)}
                  </Typography>
                  <Typography variant="body2">
                    OPS: {formatBattingAvg(stats.battingStats.ops)}
                  </Typography>
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
                  <TableCell align="center">打数</TableCell>
                  <TableCell align="center">安打</TableCell>
                  <TableCell align="center">二塁打</TableCell>
                  <TableCell align="center">三塁打</TableCell>
                  <TableCell align="center">本塁打</TableCell>
                  <TableCell align="center">打点</TableCell>
                  <TableCell align="center">四死球</TableCell>
                  <TableCell align="center">三振</TableCell>
                  <TableCell align="center">打率</TableCell>
                  <TableCell align="center">出塁率</TableCell>
                  <TableCell align="center">長打率</TableCell>
                  <TableCell align="center">OPS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamStats.map((stats) => (
                  <TableRow key={stats.teamId}>
                    <TableCell component="th" scope="row">
                      {stats.teamName}
                    </TableCell>
                    <TableCell align="center">{stats.gameCount}</TableCell>
                    <TableCell align="center">{stats.battingStats.atBats}</TableCell>
                    <TableCell align="center">{stats.battingStats.hits}</TableCell>
                    <TableCell align="center">{stats.battingStats.doubles}</TableCell>
                    <TableCell align="center">{stats.battingStats.triples}</TableCell>
                    <TableCell align="center">{stats.battingStats.homeRuns}</TableCell>
                    <TableCell align="center">{stats.battingStats.rbis}</TableCell>
                    <TableCell align="center">{stats.battingStats.walks}</TableCell>
                    <TableCell align="center">{stats.battingStats.strikeouts}</TableCell>
                    <TableCell align="center">{formatBattingAvg(stats.battingStats.battingAvg)}</TableCell>
                    <TableCell align="center">{formatBattingAvg(stats.battingStats.obp)}</TableCell>
                    <TableCell align="center">{formatBattingAvg(stats.battingStats.slg)}</TableCell>
                    <TableCell align="center">{formatBattingAvg(stats.battingStats.ops)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Container>
  );
};

export default TeamStatsList; 