import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { getUserTeams } from '../firebase/teamService';
import { getCurrentUser, onAuthStateChange } from '../firebase/authService';
import {
  buildTeamReportStats,
  getTeamReportInput,
} from '../firebase/statsService';
import type { TeamSetting } from '../types';

export default function TeamStatsPdfExport() {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<TeamSetting[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
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
  const run = async () => {
    if (locked.current) return;
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
      const sections = buildTeamReportStats(input.games, input.team);
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
        font,
        new Date(),
        check
      );
      check();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      );
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'チーム通算成績.pdf';
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
          <Button onClick={run} disabled={busy || loading || !selected}>
            生成してダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
