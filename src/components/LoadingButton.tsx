import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading: boolean;
  loadingText?: string;
  disabled?: boolean;
}

/**
 * LoadingButton - 非同期操作の状態を表示するボタンコンポーネント
 *
 * アクセシビリティ機能:
 * - aria-busy: ローディング状態をスクリーンリーダーに伝達
 * - aria-live="polite": 状態変化を通知
 * - disabled: ローディング中は操作不可（連続クリック防止）
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  loadingText = '処理中...',
  children,
  disabled = false,
  startIcon,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={20} /> : startIcon}
      aria-busy={loading}
      aria-live="polite"
    >
      {loading ? loadingText : children}
    </Button>
  );
};

export default LoadingButton;
