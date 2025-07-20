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
} from '@mui/material';
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
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>チーム</TableCell>
              {innings.map((inning) => (
                <TableCell key={inning} align="center">
                  {inning}
                </TableCell>
              ))}
              <TableCell align="center">R</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 先攻チーム */}
            <TableRow>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {awayTeam.name}
                </Typography>
              </TableCell>
              {innings.map((inning) => (
                <TableCell key={inning} align="center">
                  {calculateScore(awayTeam, inning, true)}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                {calculateTotalScore(awayTeam, true)}
              </TableCell>
            </TableRow>

            {/* 後攻チーム */}
            <TableRow>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {homeTeam.name}
                </Typography>
              </TableCell>
              {innings.map((inning) => (
                <TableCell key={inning} align="center">
                  {calculateScore(homeTeam, inning, false)}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
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
