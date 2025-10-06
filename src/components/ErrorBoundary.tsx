import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - エラーをキャッチしてフォールバックUIを表示するコンポーネント
 *
 * React 16以降のエラーバウンダリー機能を利用して、
 * 子コンポーネントでのエラーをキャッチし、アプリ全体のクラッシュを防ぎます。
 *
 * 機能:
 * - エラー発生時にユーザーフレンドリーなUIを表示
 * - 開発環境ではエラー詳細を表示
 * - 本番環境ではエラー監視サービス（Sentry等）への送信準備
 * - ホームに戻るボタンでリカバリー
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // エラーが発生したことを示すステートを返す
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログをコンソールに出力
    console.error('Error caught by boundary:', error, errorInfo);

    // エラー情報をステートに保存
    this.setState({
      error,
      errorInfo,
    });

    // TODO: 本番環境ではエラー監視サービスに送信
    // if (process.env.NODE_ENV === 'production') {
    //   // Sentry等のエラートラッキングサービスに送信
    //   // Sentry.captureException(error, {
    //   //   contexts: { react: errorInfo },
    //   // });
    // }
  }

  handleReset = () => {
    // エラーステートをリセットしてホームページに戻る
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
              aria-hidden="true"
            />
            <Typography variant="h5" component="h1" gutterBottom>
              エラーが発生しました
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              申し訳ございません。予期しないエラーが発生しました。
              <br />
              ホームに戻ってもう一度お試しください。
            </Typography>

            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'grey.100',
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 300,
                }}
                role="region"
                aria-label="エラー詳細"
              >
                <Typography
                  variant="subtitle2"
                  color="error"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  エラー詳細（開発環境のみ表示）:
                </Typography>
                <Typography variant="caption" component="pre" sx={{ mb: 2 }}>
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <>
                    <Typography
                      variant="subtitle2"
                      color="error"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      コンポーネントスタック:
                    </Typography>
                    <Typography variant="caption" component="pre">
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </>
                )}
              </Paper>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReset}
              size="large"
              aria-label="ホームに戻る"
            >
              ホームに戻る
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
