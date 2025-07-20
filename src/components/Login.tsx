import React, { useState } from 'react';
import {
  Button,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  Tab,
  Tabs,
  Link,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../contexts/AuthContext';

// タブパネルのProps
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// タブパネルコンポーネント
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Login: React.FC = () => {
  const {
    signIn,
    loginWithEmailAndPassword,
    registerWithEmailAndPassword,
    sendPasswordReset,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // フォーム入力
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  // タブ変更ハンドラー
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setShowResetForm(false);
  };

  // Googleログインハンドラー
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
    } catch (err) {
      console.error('Login failed:', err);
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // メール/パスワードログインハンドラー
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginWithEmailAndPassword(email, password);
    } catch (err: any) {
      console.error('Email login failed:', err);
      let errorMsg = 'ログインに失敗しました。';

      // Firebase Auth のエラーメッセージをより分かりやすく翻訳
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        errorMsg = 'メールアドレスまたはパスワードが正しくありません';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg =
          'ログイン試行回数が多すぎます。しばらく時間をおいてから再度お試しください';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 新規ユーザー登録ハンドラー
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerWithEmailAndPassword(email, password, displayName);
      // 登録成功後、自動的にログインタブに切り替え
      setTabValue(0);
    } catch (err: any) {
      console.error('Registration failed:', err);
      let errorMsg = '登録に失敗しました。';

      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'このメールアドレスは既に使用されています';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '有効なメールアドレスを入力してください';
      } else if (err.code === 'auth/weak-password') {
        errorMsg =
          'パスワードが弱すぎます。より強力なパスワードを設定してください';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセットハンドラー
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await sendPasswordReset(email);
      setError(
        'パスワードリセットのリンクを送信しました。メールを確認してください'
      );
    } catch (err: any) {
      console.error('Password reset failed:', err);
      let errorMsg = 'パスワードリセットに失敗しました。';

      if (err.code === 'auth/user-not-found') {
        errorMsg = 'このメールアドレスに関連するアカウントが見つかりません';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '有効なメールアドレスを入力してください';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 500,
        mx: 'auto',
        mt: 4,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        野球スコアアプリ
      </Typography>

      <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
        データを保存したり、過去の試合を見るには、ログインまたは登録してください。
      </Typography>

      {error && (
        <Alert
          severity={error.includes('送信しました') ? 'success' : 'error'}
          sx={{ width: '100%', mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            variant="fullWidth"
          >
            <Tab label="ログイン" />
            <Tab label="新規登録" />
          </Tabs>
        </Box>

        {/* ログインタブ */}
        <TabPanel value={tabValue} index={0}>
          {!showResetForm ? (
            <form onSubmit={handleEmailLogin}>
              <TextField
                label="メールアドレス"
                type="email"
                fullWidth
                variant="outlined"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
                disabled={loading}
              />
              <TextField
                label="パスワード"
                type="password"
                fullWidth
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
                }}
                disabled={loading}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'ログイン'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                パスワードをリセットするためのリンクが記載されたメールを送信します。
              </Typography>
              <TextField
                label="メールアドレス"
                type="email"
                fullWidth
                variant="outlined"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
                disabled={loading}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  'パスワードをリセット'
                )}
              </Button>
              <Button
                variant="text"
                color="primary"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => setShowResetForm(false)}
                disabled={loading}
              >
                ログイン画面に戻る
              </Button>
            </form>
          )}

          {!showResetForm && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setShowResetForm(true)}
                disabled={loading}
              >
                パスワードをお忘れですか？
              </Link>
            </Box>
          )}

          <Divider sx={{ my: 3 }}>または</Divider>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            Googleでログイン
          </Button>
        </TabPanel>

        {/* 新規登録タブ */}
        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handleRegister}>
            <TextField
              label="表示名（任意）"
              type="text"
              fullWidth
              variant="outlined"
              margin="normal"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              InputProps={{
                startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
              }}
              disabled={loading}
            />
            <TextField
              label="メールアドレス"
              type="email"
              fullWidth
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
              }}
              disabled={loading}
            />
            <TextField
              label="パスワード（6文字以上）"
              type="password"
              fullWidth
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: <LockIcon color="action" sx={{ mr: 1 }} />,
              }}
              disabled={loading}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              type="submit"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'アカウントを作成'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>または</Divider>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            Googleで登録
          </Button>
        </TabPanel>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          ※ログインすることで、あなたのデータが安全に保存されます。
        </Typography>
      </Box>
    </Paper>
  );
};

export default Login;
