import React from 'react';
import { 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography 
} from '@mui/material';
import { Team } from '../types';

interface ScoreBoardProps {
  homeTeam: Team;
  awayTeam: Team;
  currentInning: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ 
  homeTeam, 
  awayTeam, 
  currentInning 
}) => {
  // 少年野球なので最大7回まで
  const maxInning = 7;
  const displayInnings = Math.min(currentInning, maxInning);
  
  // イニングの配列を作成
  const innings = Array.from({ length: displayInnings }, (_, i) => i + 1);

  // チームの得点を計算
  const calculateScore = (team: Team, inning: number): number => {
    // 指定されたイニングの打席結果のみをフィルタリングし、打点を合計
    return team.atBats
      .filter(atBat => atBat.inning === inning)
      .reduce((total, atBat) => total + (atBat.rbi || 0), 0);
  };

  // チームの合計得点を計算
  const calculateTotalScore = (team: Team): number => {
    // 全ての打席結果の打点を合計
    return team.atBats.reduce((total, atBat) => total + (atBat.rbi || 0), 0);
  };

  // デバッグ用：各イニングの得点を確認
  console.log('Away team innings:', innings.map(inning => ({
    inning,
    score: calculateScore(awayTeam, inning),
    atBats: awayTeam.atBats.filter(atBat => atBat.inning === inning).map(a => ({ result: a.result, rbi: a.rbi }))
  })));
  console.log('Home team innings:', innings.map(inning => ({
    inning,
    score: calculateScore(homeTeam, inning),
    atBats: homeTeam.atBats.filter(atBat => atBat.inning === inning).map(a => ({ result: a.result, rbi: a.rbi }))
  })));

  return (
    <Paper sx={{ mb: 3, mt: 3 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>チーム</TableCell>
              {innings.map(inning => (
                <TableCell key={inning} align="center">{inning}</TableCell>
              ))}
              <TableCell align="center">R</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* アウェイチーム */}
            <TableRow>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {awayTeam.name}
                </Typography>
              </TableCell>
              {innings.map(inning => (
                <TableCell key={inning} align="center">
                  {calculateScore(awayTeam, inning)}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                {calculateTotalScore(awayTeam)}
              </TableCell>
            </TableRow>
            
            {/* ホームチーム */}
            <TableRow>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {homeTeam.name}
                </Typography>
              </TableCell>
              {innings.map(inning => (
                <TableCell key={inning} align="center">
                  {calculateScore(homeTeam, inning)}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                {calculateTotalScore(homeTeam)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ScoreBoard; 