import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from '@mui/material';
import { getUserTeams } from '../firebase/teamService';
import { getCurrentUser, onAuthStateChange } from '../firebase/authService';
import {
  buildTeamReportStats,
  getTeamReportInput,
} from '../firebase/statsService';
import type { GameType, TeamSetting } from '../types';
import {
  ChartScope,
  DETAILED_PDF_OPTIONS,
  TeamStatsPdfOptions,
  filterGamesByPeriod,
  validatePdfOptions,
} from '../services/TeamStatsPdfOptions';

const TYPE_LABELS: [GameType, string][] = [
  ['official', '公式戦'],
  ['practice', '練習試合'],
  ['junior', 'ジュニア戦'],
];
const CHART_LABELS: [ChartScope, string][] = [
  ['none', '表のみ'],
  ['team', 'チームのみ'],
  ['all', 'チームと全選手'],
];

// An empty date input means "no bound".
const toOptions = (
  types: GameType[],
  start: string,
  end: string,
  charts: ChartScope,
  omitEmptyCharts: boolean
): TeamStatsPdfOptions => ({
  types,
  period: { ...(start && { start }), ...(end && { end }) },
  charts,
  omitEmptyCharts: charts === 'all' && omitEmptyCharts,
});

export default function TeamStatsPdfExport() {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamSetting[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [simple, setSimple] = useState(false);
  const [types, setTypes] = useState<GameType[]>(
    TYPE_LABELS.map(([type]) => type)
  );
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [charts, setCharts] = useState<ChartScope>('all');
  const [omitEmpty, setOmitEmpty] = useState(false);
  const generation = useRef(0);
  const locked = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    []
  );
  const show = async () => {
    const id = ++generation.current;
    const owner = getCurrentUser()?.uid;
    setOpen(true);
    setLoading(true);
    setLoadFailed(false);
    setMessage('');
    setTeams([]);
    setSelected('');
    try {
      const list = await getUserTeams();
      if (generation.current !== id || getCurrentUser()?.uid !== owner) return;
      setTeams(list);
    } catch {
      if (generation.current === id) {
        setLoadFailed(true);
        setMessage('登録チームを取得できませんでした');
      }
    } finally {
      if (generation.current === id) setLoading(false);
    }
  };
  const options = simple
    ? toOptions(types, start, end, charts, omitEmpty)
    : DETAILED_PDF_OPTIONS;
  const optionError = (() => {
    try {
      validatePdfOptions(options);
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : '出力条件が不正です';
    }
  })();
  const run = async () => {
    if (locked.current || optionError) return;
    const owner = getCurrentUser()?.uid;
    const teamId = selected;
    if (!owner || !teamId) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    const id = ++generation.current;
    const check = () => {
      if (generation.current !== id || getCurrentUser()?.uid !== owner)
        throw new Error('キャンセルまたはログイン状態の変更により中止しました');
    };
    const unsubscribe = onAuthStateChange((user) => {
      if (user?.uid !== owner) generation.current++;
    });
    try {
      const input = await getTeamReportInput(owner, teamId);
      check();
      // Tables, ledger and charts all come from this one period-filtered set.
      const games = filterGamesByPeriod(
        input.games,
        options.period,
        options.types
      );
      const sections = buildTeamReportStats([...games], input.team);
      const module = await import('../services/TeamStatsPdf');
      check();
      const response = await fetch(
        `${process.env.PUBLIC_URL}/fonts/NotoSansJP.ttf`
      );
      if (!response.ok) throw new Error('日本語フォントを取得できませんでした');
      const font = await response.arrayBuffer();
      check();
      const bytes = await module.createTeamStatsPdf(
        sections,
        games,
        font,
        new Date(),
        check,
        options
      );
      check();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      );
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = simple
          ? 'チーム通算成績（簡易版）.pdf'
          : 'チーム通算成績.pdf';
        link.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMessage('PDFを生成し、ダウンロードを開始しました');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'PDFの生成に失敗しました'
      );
    } finally {
      unsubscribe();
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="contained" onClick={show}>
        PDF出力
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) {
            generation.current++;
            setOpen(false);
          }
        }}
        fullWidth
      >
        <DialogTitle>チーム通算成績のPDF出力</DialogTitle>
        <DialogContent>
          <p>
            公式戦・練習試合・ジュニア戦を順に出力します。選手数や氏名の長さにより続きページを追加します。
          </p>
          <p>
            各区分の成績表の後に、チームと全選手の打撃成績推移グラフ（打率・出塁率・長打率・OPSの累積値）を掲載します。選手数や試合数に応じてページ数と作成時間が増えます。
          </p>
          {message && (
            <Alert severity="info" role="status">
              {message}
            </Alert>
          )}
          {loading ? (
            <CircularProgress aria-label="登録チームを取得中" />
          ) : loadFailed ? null : !teams.length ? (
            <Alert severity="info">
              登録チームがありません。チーム・選手管理から登録してください。
            </Alert>
          ) : (
            <FormControl fullWidth margin="normal">
              <InputLabel id="pdf-team-label">対象チーム</InputLabel>
              <Select
                labelId="pdf-team-label"
                label="対象チーム"
                value={selected}
                disabled={busy}
                onChange={(event) => setSelected(event.target.value)}
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}（ID: {team.id}）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {!loading && !loadFailed && teams.length > 0 && (
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend">出力内容</FormLabel>
              <RadioGroup
                value={simple ? 'simple' : 'detailed'}
                onChange={(event) => setSimple(event.target.value === 'simple')}
              >
                <FormControlLabel
                  value="detailed"
                  control={<Radio disabled={busy} />}
                  label="詳細版（全期間・3区分・チームと全選手のグラフ）"
                />
                <FormControlLabel
                  value="simple"
                  control={<Radio disabled={busy} />}
                  label="簡易版（期間・区分・グラフを選ぶ）"
                />
              </RadioGroup>
            </FormControl>
          )}
          {simple && !loading && teams.length > 0 && (
            <>
              <FormGroup row sx={{ gap: 2, my: 1 }}>
                <TextField
                  type="date"
                  label="開始日"
                  value={start}
                  disabled={busy}
                  onChange={(event) => setStart(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  label="終了日"
                  value={end}
                  disabled={busy}
                  onChange={(event) => setEnd(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </FormGroup>
              <p>
                期間は開始日・終了日を含みます。空欄の側は期限を設けません。
              </p>
              <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">出力する区分</FormLabel>
                <FormGroup row>
                  {TYPE_LABELS.map(([type, label]) => (
                    <FormControlLabel
                      key={type}
                      label={label}
                      control={
                        <Checkbox
                          checked={types.includes(type)}
                          disabled={busy}
                          onChange={(event) =>
                            setTypes((current) =>
                              TYPE_LABELS.map(([item]) => item).filter(
                                (item) =>
                                  item === type
                                    ? event.target.checked
                                    : current.includes(item)
                              )
                            )
                          }
                        />
                      }
                    />
                  ))}
                </FormGroup>
              </FormControl>
              <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">推移グラフ</FormLabel>
                <RadioGroup
                  row
                  value={charts}
                  onChange={(event) =>
                    setCharts(event.target.value as ChartScope)
                  }
                >
                  {CHART_LABELS.map(([value, label]) => (
                    <FormControlLabel
                      key={value}
                      value={value}
                      control={<Radio disabled={busy} />}
                      label={label}
                    />
                  ))}
                </RadioGroup>
                <FormControlLabel
                  label="打席記録のない選手のグラフ枠を省略（成績表には全選手を掲載）"
                  control={
                    <Checkbox
                      checked={omitEmpty}
                      disabled={busy || charts !== 'all'}
                      onChange={(event) => setOmitEmpty(event.target.checked)}
                    />
                  }
                />
              </FormControl>
              {optionError && <Alert severity="error">{optionError}</Alert>}
            </>
          )}
          {busy && <p role="status">PDFを作成中です。お待ちください。</p>}
        </DialogContent>
        <DialogActions>
          {busy ? (
            <Button
              onClick={() => {
                generation.current++;
              }}
            >
              キャンセル
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)}>閉じる</Button>
          )}
          <Button
            onClick={run}
            disabled={busy || loading || !selected || !!optionError}
          >
            生成してダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
