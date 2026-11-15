import React, { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount, getReauthMethod } from '../firebase/accountService';
import { AccountDeletionIncompleteError } from '../firebase/accountErrors';
import { getAuthErrorMessage } from '../utils/authErrorMessage';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = 'delete-account-title';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'パスワードが正しくありません',
  'auth/wrong-password': 'パスワードが正しくありません',
  'auth/popup-closed-by-user':
    '確認のためのログインがキャンセルされたため、削除していません',
  'auth/requires-recent-login':
    'セキュリティのため、もう一度ログインしてから削除してください',
};

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  open,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setConfirmed(false);
    setPassword('');
    setError(null);
    onClose();
  };

  // 閉じている間は再認証の要否などを計算しない
  if (!open || !currentUser) return null;

  // 削除の前に、必ず本人確認（再認証）を行う
  const method = getReauthMethod(currentUser);
  const needsPassword = method === 'password';
  const ready = confirmed && !busy && (!needsPassword || password.length > 0);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(needsPassword ? { password } : {});
      // 成功すると認証状態が変わり、ログイン画面に戻る
    } catch (err) {
      console.error('Account deletion failed:', err);
      setError(
        err instanceof AccountDeletionIncompleteError
          ? err.message
          : getAuthErrorMessage(
              err,
              ERROR_MESSAGES,
              'アカウントの削除に失敗しました'
            )
      );
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      aria-labelledby={TITLE_ID}
    >
      <DialogTitle id={TITLE_ID}>アカウントを削除</DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ mb: 2 }}>
          <p>
            <strong>この操作は取り消せません。</strong>
            アカウントと、あなたが保存したすべての試合・チーム・選手のデータを削除します。
          </p>
          <p>
            公開中の試合も削除されるため、共有リンクからは見られなくなります。
          </p>
          {method === 'google' && (
            <p>
              セキュリティのため、削除の前に Google のログイン画面が開きます。
            </p>
          )}
        </DialogContentText>
        {needsPassword && (
          <TextField
            label="パスワード"
            type="password"
            fullWidth
            margin="dense"
            autoComplete="current-password"
            helperText="削除の前に本人確認をします。現在のパスワードを入力してください"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
        )}
        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={busy}
            />
          }
          label="取り消せないことを理解しました"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          キャンセル
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleDelete}
          disabled={!ready}
        >
          {busy ? <CircularProgress size={20} /> : 'アカウントを削除'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteAccountDialog;
