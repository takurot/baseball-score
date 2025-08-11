import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Team, RunEvent } from '../types';

interface ScoreBoardProps {
  homeTeam: Team;
  awayTeam: Team;
  currentInning: number;
  runEvents?: RunEvent[];
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  homeTeam,
  awayTeam,
  currentInning,
  runEvents = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 少年野球なので最大7回まで
  const maxInning = 7;
  const displayInnings = Math.min(currentInning, maxInning);

  // イニングの配列を作成
  const innings = Array.from({ length: displayInnings }, (_, i) => i + 1);

  // 得点イベントから得点を計算
  const calculateRunEventsScore = (inning: number, isTop: boolean): number => {
    return runEvents
      .filter((event) => event.inning === inning && event.isTop === isTop)
      .reduce((total, event) => total + (event.runCount || 0), 0);
  };

  // チームの得点を計算
  const calculateScore = (
    team: Team,
    inning: number,
    isAwayTeam: boolean
  ): number => {
    // 打席結果からの得点
    const atBatScore = team.atBats
      .filter((atBat) => atBat.inning === inning)
      .reduce((total, atBat) => total + (atBat.rbi || 0), 0);

    // 得点イベントからの得点（先攻チームは表、後攻チームは裏）
    const runEventScore = calculateRunEventsScore(inning, isAwayTeam);

    return atBatScore + runEventScore;
  };

  // チームの合計得点を計算
  const calculateTotalScore = (team: Team, isAwayTeam: boolean): number => {
    // 全ての打席結果の打点を合計
    const atBatTotal = team.atBats.reduce(
      (total, atBat) => total + (atBat.rbi || 0),
      0
    );

    // 全ての得点イベントを合計（イニングごとにフィルタリング）
    const runEventTotal = runEvents
      .filter((event) => event.isTop === isAwayTeam)
      .reduce((total, event) => total + (event.runCount || 0), 0);

    return atBatTotal + runEventTotal;
  };

  // デバッグ用：各イニングの得点を確認
  console.log(
    'Away team innings:',
    innings.map((inning) => ({
      inning,
      score: calculateScore(awayTeam, inning, true),
      atBats: awayTeam.atBats
        .filter((atBat) => atBat.inning === inning)
        .map((a) => ({ result: a.result, rbi: a.rbi })),
      runEvents: runEvents.filter(
        (event) => event.inning === inning && event.isTop === true
      ),
    }))
  );
  console.log(
    'Home team innings:',
    innings.map((inning) => ({
      inning,
      score: calculateScore(homeTeam, inning, false),
      atBats: homeTeam.atBats
        .filter((atBat) => atBat.inning === inning)
        .map((a) => ({ result: a.result, rbi: a.rbi })),
      runEvents: runEvents.filter(
        (event) => event.inning === inning && event.isTop === false
      ),
    }))
  );

  return (
    <Paper sx={{ mb: 3, mt: 3 }}>
      <TableContainer
        sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#888',
            borderRadius: 4,
          },
        }}
      >
        <Table
          size={isMobile ? 'small' : 'medium'}
          sx={{
            minWidth: isMobile ? 300 : 'auto',
            '& .MuiTableCell-root': {
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              padding: isMobile ? '6px 8px' : '8px 16px',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  minWidth: isMobile ? '60px' : '80px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                チーム
              </TableCell>
              {innings.map((inning) => (
                <TableCell
                  key={inning}
                  align="center"
                  sx={{
                    fontWeight: inning === currentInning ? 'bold' : 'normal',
                    backgroundColor:
                      inning === currentInning
                        ? theme.palette.action.selected
                        : 'transparent',
                    minWidth: isMobile ? '32px' : '40px',
                  }}
                >
                  {inning}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 'bold',
                  minWidth: isMobile ? '40px' : '50px',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                R
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 先攻チーム */}
            <TableRow>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
                >
                  {awayTeam.name}
                </Typography>
              </TableCell>
              {innings.map((inning) => (
                <TableCell
                  key={inning}
                  align="center"
                  sx={{
                    backgroundColor:
                      inning === currentInning
                        ? theme.palette.action.selected
                        : 'transparent',
                  }}
                >
                  {calculateScore(awayTeam, inning, true)}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 'bold',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                {calculateTotalScore(awayTeam, true)}
              </TableCell>
            </TableRow>

            {/* 後攻チーム */}
            <TableRow>
              <TableCell
                sx={{
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
                >
                  {homeTeam.name}
                </Typography>
              </TableCell>
              {innings.map((inning) => (
                <TableCell
                  key={inning}
                  align="center"
                  sx={{
                    backgroundColor:
                      inning === currentInning
                        ? theme.palette.action.selected
                        : 'transparent',
                  }}
                >
                  {calculateScore(homeTeam, inning, false)}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 'bold',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                {calculateTotalScore(homeTeam, false)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ScoreBoard;
