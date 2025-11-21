import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Team, RunEvent, HitResult } from '../types';

const HIT_RESULT_SET = new Set<HitResult>(
  ['IH', 'LH', 'CH', 'RH', '2B', '3B', 'HR'] as HitResult[]
);
const countHits = (team: Team): number =>
  team.atBats.filter((atBat) => HIT_RESULT_SET.has(atBat.result)).length;

const countErrors = (team: Team): number =>
  team.atBats.filter((atBat) => atBat.result === 'E').length;

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
  const headingId = useId();

  // 少年野球なので最大7回まで
  const maxInning = 7;
  const displayInnings = Math.min(currentInning, maxInning);

  // イニングの配列を作成（メモ化）
  const innings = useMemo(
    () => Array.from({ length: displayInnings }, (_, i) => i + 1),
    [displayInnings]
  );

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

  // 合計得点を事前に計算してメモ化
  const totalScores = useMemo(
    () => ({
      away: calculateTotalScore(awayTeam, true),
      home: calculateTotalScore(homeTeam, false),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [awayTeam, homeTeam, runEvents]
  );

  // 横スクロール可能かどうかを検出
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (containerRef.current) {
        const { scrollWidth, clientWidth } = containerRef.current;
        setIsScrollable(scrollWidth > clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [innings.length]);

  const summaryData = useMemo(
    () => ({
      away: {
        runs: totalScores.away,
        hits: countHits(awayTeam),
        errors: countErrors(awayTeam),
      },
      home: {
        runs: totalScores.home,
        hits: countHits(homeTeam),
        errors: countErrors(homeTeam),
      },
    }),
    [awayTeam, homeTeam, totalScores]
  );

  const teamSummaries: Array<{ team: Team; key: 'home' | 'away' }> = [
    { team: awayTeam, key: 'away' },
    { team: homeTeam, key: 'home' },
  ];

  const highlightStyles = {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderLeft: `2px solid ${theme.palette.primary.main}`,
    borderRight: `2px solid ${theme.palette.primary.main}`,
    fontWeight: 600,
  };

  const stripeBackground = alpha(
    theme.palette.primary.main,
    theme.palette.action.selectedOpacity ?? 0.08
  );

  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      sx={{ mb: 3, mt: 3, p: { xs: 2, sm: 3 } }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Typography
          id={headingId}
          component="h2"
          variant="subtitle1"
          fontWeight={600}
        >
          スコアボード
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            width: '100%',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          {teamSummaries.map(({ team, key }) => {
            const summary = summaryData[key];
            return (
              <Box
                key={key}
                data-testid={`scoreboard-summary-${key}`}
                sx={{
                  flex: 1,
                  minWidth: 160,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 1.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {team.name}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  R {summary.runs} / H {summary.hits} / E {summary.errors}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Stack>

      <TableContainer
        ref={containerRef}
        sx={{
          position: 'relative',
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
          // 横スクロールインジケータ（グラデーション）
          '&::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: '30px',
            background:
              'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
            pointerEvents: 'none',
            opacity: isScrollable ? 1 : 0,
            transition: 'opacity 0.3s',
            zIndex: 1,
          },
        }}
      >
        <Table
          size={isMobile ? 'small' : 'medium'}
          sx={{
            minWidth: isMobile ? 300 : 'auto',
            mt: 2,
            '& .MuiTableCell-root': {
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              padding: isMobile ? '6px 8px' : '8px 16px',
            },
            '& .MuiTableCell-head': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                component="th"
                scope="col"
                sx={{
                  fontWeight: 'bold',
                  minWidth: isMobile ? '60px' : '80px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 2,
                }}
              >
                チーム
              </TableCell>
              {innings.map((inning) => (
                <TableCell
                  key={inning}
                  component="th"
                  scope="col"
                  align="right"
                  aria-current={inning === currentInning ? 'true' : undefined}
                  sx={{
                    fontWeight: inning === currentInning ? 'bold' : 'normal',
                    ...(inning === currentInning ? highlightStyles : {}),
                    minWidth: isMobile ? '32px' : '40px',
                  }}
                >
                  {inning}
                </TableCell>
              ))}
              <TableCell
                component="th"
                scope="col"
                align="right"
                aria-label="合計得点"
                title="合計得点"
                sx={{
                  fontWeight: 'bold',
                  minWidth: isMobile ? '40px' : '50px',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 2,
                }}
              >
                R
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 先攻チーム */}
            <TableRow
              sx={{
                '&:nth-of-type(odd) td': {
                  backgroundColor: stripeBackground,
                },
              }}
            >
              <TableCell
                component="th"
                scope="row"
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
                  align="right"
                  aria-current={inning === currentInning ? 'true' : undefined}
                  sx={{
                    ...(inning === currentInning ? highlightStyles : {}),
                  }}
                >
                  {calculateScore(awayTeam, inning, true)}
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{
                  fontWeight: 'bold',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                {totalScores.away}
              </TableCell>
            </TableRow>

            {/* 後攻チーム */}
            <TableRow
              sx={{
                '&:nth-of-type(odd) td': {
                  backgroundColor: stripeBackground,
                },
              }}
            >
              <TableCell
                component="th"
                scope="row"
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
                  align="right"
                  aria-current={inning === currentInning ? 'true' : undefined}
                  sx={{
                    ...(inning === currentInning ? highlightStyles : {}),
                  }}
                >
                  {calculateScore(homeTeam, inning, false)}
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{
                  fontWeight: 'bold',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  zIndex: 1,
                }}
              >
                {totalScores.home}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default React.memo(ScoreBoard);
