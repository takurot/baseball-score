import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Game, TrendPoint } from '../types';
import { GameTypeFilter, getGameTypeLabel } from '../utils/gameType';
import { buildBattingTrend } from '../services/BattingStatsTrend';
import {
  TREND_SERIES,
  axisLabel,
  axisLabelIndices,
  buildTrendScale,
  formatRate,
  formatTrendPeriod,
  projectSeries,
  showMarkers,
  toPathData,
  xPosition,
} from '../services/BattingTrendChart';

export interface TrendSubject {
  teamId: string;
  teamName: string;
  player?: { id: string; name: string; number: string };
}

interface BattingTrendDialogProps {
  subject: TrendSubject | null;
  games: readonly Game[];
  filter: GameTypeFilter;
  onClose: () => void;
}

type TrendResult =
  { kind: 'ok'; points: TrendPoint[] } | { kind: 'error'; message: string };

const LAYOUTS = {
  wide: { width: 640, height: 300, left: 46, right: 12, top: 12, bottom: 28 },
  compact: { width: 340, height: 240, left: 42, right: 8, top: 10, bottom: 28 },
};
const AXIS_LABEL_SLOT = 56;
const CHART_INK = '#424242';

export const subjectName = (subject: TrendSubject): string =>
  subject.player
    ? `${subject.player.number} ${subject.player.name}`.trim()
    : subject.teamName;

const filterLabel = (filter: GameTypeFilter): string =>
  filter === 'all' ? 'すべて（統合）' : getGameTypeLabel(filter);

const describePoint = (point: TrendPoint): string => {
  const head = `${point.game.label} 対 ${point.game.opponentName}（試合ID: ${point.game.id}）`;
  if (!point.rates) return `${head}: 初打席前のため値なし`;
  const rates = point.rates;
  return `${head}: ${TREND_SERIES.map(
    (series) => `${series.label} ${formatRate(rates[series.metric])}`
  ).join('、')}`;
};

function SeriesSwatch({ index }: { index: number }) {
  const series = TREND_SERIES[index];
  return (
    <svg width={28} height={12} viewBox="0 0 28 12" aria-hidden="true">
      <line
        x1={0}
        x2={28}
        y1={6}
        y2={6}
        stroke={series.color}
        strokeWidth={2}
        strokeDasharray={series.dash.join(' ') || undefined}
      />
      <path
        d={series.marker}
        transform="translate(14 6)"
        fill={series.color}
        stroke="#ffffff"
      />
    </svg>
  );
}

interface TrendChartProps {
  points: TrendPoint[];
  selected: number;
  onSelect: (index: number) => void;
  compact: boolean;
}

function TrendChart({ points, selected, onSelect, compact }: TrendChartProps) {
  const layout = compact ? LAYOUTS.compact : LAYOUTS.wide;
  const plotWidth = layout.width - layout.left - layout.right;
  const plotHeight = layout.height - layout.top - layout.bottom;
  const scale = buildTrendScale(points);
  const columnWidth = plotWidth / points.length;
  const keySteps: Record<string, number> = {
    ArrowLeft: selected - 1,
    ArrowRight: selected + 1,
    Home: 0,
    End: points.length - 1,
  };

  return (
    <Box
      role="group"
      tabIndex={0}
      aria-label="推移グラフ。左右の矢印キーで試合を選択できます"
      onKeyDown={(event) => {
        const next = keySteps[event.key];
        if (next === undefined) return;
        event.preventDefault();
        onSelect(Math.min(points.length - 1, Math.max(0, next)));
      }}
      sx={{
        borderRadius: 1,
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
        },
      }}
    >
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <g transform={`translate(${layout.left} ${layout.top})`}>
          {scale.ticks.map((tick) => {
            const y = (1 - tick / scale.max) * plotHeight;
            return (
              <g key={tick}>
                <line x1={0} x2={plotWidth} y1={y} y2={y} stroke="#e0e0e0" />
                <text
                  x={-6}
                  y={y}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fill={CHART_INK}
                  data-testid="trend-tick"
                >
                  {formatRate(tick)}
                </text>
              </g>
            );
          })}
          <line x1={0} x2={0} y1={0} y2={plotHeight} stroke="#9e9e9e" />
          <line
            x1={0}
            x2={plotWidth}
            y1={plotHeight}
            y2={plotHeight}
            stroke="#9e9e9e"
          />
          {axisLabelIndices(
            points.length,
            Math.floor(plotWidth / AXIS_LABEL_SLOT)
          ).map((index) => (
            <text
              key={index}
              x={xPosition(index, points.length, plotWidth)}
              y={plotHeight + 17}
              textAnchor="middle"
              fontSize={11}
              fill={CHART_INK}
            >
              {axisLabel(points[index].game)}
            </text>
          ))}
          <line
            x1={xPosition(selected, points.length, plotWidth)}
            x2={xPosition(selected, points.length, plotWidth)}
            y1={0}
            y2={plotHeight}
            stroke="#757575"
            strokeDasharray="2 2"
          />
          {TREND_SERIES.map((series) => {
            const plotted = projectSeries(
              points,
              series.metric,
              scale,
              plotWidth,
              plotHeight
            );
            const path = toPathData(plotted);
            const markers = showMarkers(
              points.length,
              plotted.length,
              plotWidth
            );
            return (
              <g key={series.metric} data-series={series.metric}>
                {path && (
                  <path
                    d={path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2}
                    strokeDasharray={series.dash.join(' ') || undefined}
                  />
                )}
                {plotted
                  .filter((p) => markers || p.index === selected)
                  .map((p) => (
                    <path
                      key={p.index}
                      d={series.marker}
                      transform={`translate(${p.x} ${p.y})`}
                      fill={series.color}
                      stroke="#ffffff"
                    />
                  ))}
              </g>
            );
          })}
          {points.map((point, index) => (
            <rect
              key={point.game.id}
              data-game-id={point.game.id}
              x={index * columnWidth}
              y={0}
              width={columnWidth}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => onSelect(index)}
              onClick={() => onSelect(index)}
            />
          ))}
        </g>
      </svg>
    </Box>
  );
}

function TrendTable({
  points,
  selected,
}: {
  points: TrendPoint[];
  selected: number;
}) {
  return (
    <TableContainer sx={{ maxHeight: 320, mt: 2 }}>
      <Table
        size="small"
        stickyHeader
        aria-label="試合ごとの累積値"
        sx={{ '& th, & td': { whiteSpace: 'nowrap' } }}
      >
        <TableHead>
          <TableRow>
            <TableCell>試合（試合日）</TableCell>
            <TableCell>対戦相手</TableCell>
            {TREND_SERIES.map((series) => (
              <TableCell key={series.metric} align="right">
                {series.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {points.map((point, index) => (
            <TableRow key={point.game.id} selected={index === selected}>
              <TableCell component="th" scope="row">
                {point.game.label}
              </TableCell>
              <TableCell>{point.game.opponentName}</TableCell>
              {TREND_SERIES.map((series) => (
                <TableCell key={series.metric} align="right">
                  {point.rates ? formatRate(point.rates[series.metric]) : '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TrendBody({
  points,
  compact,
}: {
  points: TrendPoint[];
  compact: boolean;
}) {
  const [selected, setSelected] = useState(points.length - 1);
  return (
    <>
      <Box sx={{ bgcolor: '#ffffff', color: '#212121', borderRadius: 1, p: 1 }}>
        <Box
          component="ul"
          aria-label="凡例"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            listStyle: 'none',
            p: 0,
            m: 0,
            mb: 1,
          }}
        >
          {TREND_SERIES.map((series, index) => (
            <Box
              component="li"
              key={series.metric}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <SeriesSwatch index={index} />
              <Typography variant="body2" component="span">
                {series.label}
              </Typography>
            </Box>
          ))}
        </Box>
        <TrendChart
          points={points}
          selected={selected}
          onSelect={setSelected}
          compact={compact}
        />
      </Box>
      <Typography variant="body2" aria-live="polite" sx={{ mt: 1 }}>
        選択中: {describePoint(points[selected])}
      </Typography>
      <TrendTable points={points} selected={selected} />
    </>
  );
}

export default function BattingTrendDialog({
  subject,
  games,
  filter,
  onClose,
}: BattingTrendDialogProps) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  // Keep the last subject so the content stays visible while the dialog closes.
  const shown = useRef(subject);
  if (subject) shown.current = subject;
  const current = shown.current;

  const result = useMemo<TrendResult | null>(() => {
    if (!current) return null;
    try {
      return {
        kind: 'ok',
        points: buildBattingTrend(games, filter, {
          teamId: current.teamId,
          playerId: current.player?.id,
        }),
      };
    } catch (error) {
      return {
        kind: 'error',
        message:
          error instanceof Error ? error.message : '推移を作成できませんでした',
      };
    }
  }, [current, games, filter]);

  if (!current || !result) return null;
  const points = result.kind === 'ok' ? result.points : [];

  return (
    <Dialog
      open={subject !== null}
      onClose={onClose}
      fullScreen={compact}
      fullWidth
      maxWidth="md"
      aria-labelledby="batting-trend-title"
    >
      <DialogTitle id="batting-trend-title">
        {subjectName(current)}の打撃成績推移
      </DialogTitle>
      <DialogContent>
        {current.player && (
          <Typography variant="body2">チーム: {current.teamName}</Typography>
        )}
        <Typography variant="body2">試合区分: {filterLabel(filter)}</Typography>
        <Typography variant="body2">
          対象期間: {formatTrendPeriod(points)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          各試合までの打席を合計して計算した累積値です。同日の試合は保存されたIDの順に並べており、実際の開催順とは限りません。
        </Typography>
        {result.kind === 'error' ? (
          <Alert severity="error">{result.message}</Alert>
        ) : !points.length ? (
          <Alert severity="info">該当区分の試合はありません</Alert>
        ) : !points.some((point) => point.rates) ? (
          <Alert severity="info">打席記録なし</Alert>
        ) : (
          <TrendBody
            key={`${filter}:${current.teamId}:${current.player?.id ?? ''}`}
            points={points}
            compact={compact}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
