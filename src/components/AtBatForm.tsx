import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Sports as SportsIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { HitResult, Player, AtBat } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { HIT_RESULTS, OUT_RESULTS } from '../services/ScoreCalculator';

// カスタムカラー定義
const customColors = {
  hit: '#4CAF50', // 緑（ヒット）
  out: '#9E9E9E', // グレー（アウト）
  walk: '#2196F3', // 青（四球系）
  other: '#607D8B', // 青灰色（その他）
};

// 結果に応じた色を返す関数
const getResultColor = (result: HitResult): string => {
  const walkPatterns = ['BB', 'HBP'];

  if (HIT_RESULTS.includes(result)) {
    return customColors.hit;
  }
  if (OUT_RESULTS.includes(result)) {
    return customColors.out;
  }
  if (walkPatterns.includes(result)) {
    return customColors.walk;
  }
  return customColors.other;
};

interface AtBatFormProps {
  player: Player | null;
  inning: number;
  isTop: boolean;
  onAddAtBat: (atBat: AtBat) => void;
  editingAtBat?: AtBat | null;
  onUpdateAtBat?: (atBat: AtBat) => void;
  onCancelEdit?: () => void;
}

// 打撃結果の表示名マッピング
const hitResultLabels: Record<HitResult, string> = {
  // ヒット
  IH: '内野安打',
  LH: 'レフトヒット',
  CH: 'センターヒット',
  RH: 'ライトヒット',
  '2B': '二塁打',
  '3B': '三塁打',
  HR: 'ホームラン',

  // アウト
  GO_P: 'ピッチャーゴロ',
  GO_C: 'キャッチャーゴロ',
  GO_1B: 'ファーストゴロ',
  GO_2B: 'セカンドゴロ',
  GO_3B: 'サードゴロ',
  GO_SS: 'ショートゴロ',
  GO_RF: 'ライトゴロ',
  FO_LF: 'レフトフライ',
  FO_CF: 'センターフライ',
  FO_RF: 'ライトフライ',
  FO_IF: '内野フライ',
  LO: 'ライナー',
  DP: '併殺打',

  // その他
  SAC: '犠打',
  SF: '犠飛',
  BB: '四球',
  HBP: '死球',
  SO: '三振',
  E: 'エラー',
  FC: 'フィールダーチョイス',
  OTH: 'その他',
};

// 結果がアウトかどうかを判定する関数
const isOutResult = (result: HitResult): boolean => {
  return OUT_RESULTS.includes(result);
};

// 打撃結果をカテゴリごとにグループ化（定数なのでコンポーネント外に配置）
const hitOptions = [
  {
    category: 'ヒット',
    items: [...HIT_RESULTS],
  },
  {
    category: 'ゴロアウト',
    items: [
      'GO_P',
      'GO_C',
      'GO_1B',
      'GO_2B',
      'GO_3B',
      'GO_SS',
      'GO_RF',
    ] as HitResult[],
  },
  {
    category: 'フライアウト',
    items: ['FO_LF', 'FO_CF', 'FO_RF', 'FO_IF', 'LO'] as HitResult[],
  },
  { category: 'その他アウト', items: ['DP', 'SO'] as HitResult[] },
  { category: '犠打/犠飛', items: ['SAC', 'SF'] as HitResult[] },
  {
    category: 'その他',
    items: ['BB', 'HBP', 'E', 'FC', 'OTH'] as HitResult[],
  },
];

// カテゴリーに対応するアイコンを返す関数（コンポーネント外に配置）
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'ヒット':
      return (
        <CheckCircleIcon fontSize="small" sx={{ color: customColors.hit }} />
      );
    case 'ゴロアウト':
    case 'フライアウト':
    case 'その他アウト':
      return <CancelIcon fontSize="small" sx={{ color: customColors.out }} />;
    case '犠打/犠飛':
      return <SportsIcon fontSize="small" sx={{ color: customColors.out }} />;
    case 'その他':
      return (
        <MoreHorizIcon fontSize="small" sx={{ color: customColors.walk }} />
      );
    default:
      return null;
  }
};

const AtBatForm: React.FC<AtBatFormProps> = ({
  player,
  inning,
  isTop,
  onAddAtBat,
  editingAtBat,
  onUpdateAtBat,
  onCancelEdit,
}) => {
  // 誤入力を防ぐため、初期状態では結果を未選択（null）にする
  const [result, setResult] = useState<HitResult | null>(null);
  const [description, setDescription] = useState('');
  const [rbi, setRbi] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState('');

  // フォーカス管理用のref
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const resetFormFields = useCallback(() => {
    setResult(null);
    setDescription('');
    setRbi(0);
  }, []);

  // 編集モードの場合、フォームに値をセット
  useEffect(() => {
    if (editingAtBat) {
      setResult(editingAtBat.result);
      setDescription(editingAtBat.description || '');
      setRbi(editingAtBat.rbi || 0);
      setSuccessMessage('');
    } else {
      resetFormFields();
    }
  }, [editingAtBat, resetFormFields]);

  // 成功メッセージを3秒後に自動的にクリア
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 編集モードかどうか
  const isEditMode = !!editingAtBat;

  // 選手が選択されていない場合（編集モードでない場合のみ表示）
  if (!player && !isEditMode) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>
          選手リストから選手をクリックして選択してください
        </Typography>
      </Box>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 結果が未選択の場合は登録・更新できない（送信ボタンも disabled にしているが、念のため型ガード）
    if (!result) return;

    if (isEditMode && editingAtBat) {
      if (!onUpdateAtBat) return;

      // 編集モードの場合
      const updatedAtBat: AtBat = {
        ...editingAtBat,
        result,
        description: description || undefined,
        rbi: rbi,
        isOut: isOutResult(result),
      };

      onUpdateAtBat(updatedAtBat);
      setSuccessMessage('打席結果を更新しました');
    } else if (player) {
      // 新規登録モードの場合
      const newAtBat: AtBat = {
        id: uuidv4(),
        playerId: player.id,
        inning,
        isTop,
        result,
        description: description || undefined,
        rbi: rbi,
        isOut: isOutResult(result),
        timestamp: Date.now(),
      };

      onAddAtBat(newAtBat);
      setSuccessMessage('打席結果を登録しました');
    }

    // フォームをリセット
    resetFormFields();

    // 送信ボタンにフォーカスを戻す
    if (submitButtonRef.current) {
      submitButtonRef.current.focus();
    }
  };

  // 編集をキャンセル
  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }

    // フォームをリセット
    resetFormFields();
    setSuccessMessage('');
  };

  // 表示する選手名
  const displayPlayerName = isEditMode
    ? player?.name || '不明な選手'
    : player?.name;

  // 表示するポジション
  const displayPosition = isEditMode
    ? player?.position || ''
    : player?.position;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {isEditMode ? '打席結果編集' : '打席結果登録'}: {displayPlayerName} (
        {displayPosition})
      </Typography>

      {/* 成功メッセージ（スクリーンリーダー対応） */}
      {successMessage && (
        <Box
          role="status"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'success.light',
            color: 'success.contrastText',
            borderRadius: 1,
          }}
        >
          <Typography>{successMessage}</Typography>
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography
              id="result-group-label"
              variant="subtitle2"
              gutterBottom
            >
              打席結果（必須）
            </Typography>
            <Box
              role="group"
              aria-labelledby="result-group-label"
              aria-describedby="result-helper-text"
            >
              {hitOptions.map((group) => (
                <Box key={group.category} sx={{ mb: 1.5 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5,
                    }}
                  >
                    {getCategoryIcon(group.category)}
                    {group.category}
                  </Typography>
                  <ToggleButtonGroup
                    value={
                      result && group.items.includes(result) ? result : null
                    }
                    exclusive
                    onChange={(_e, value: HitResult | null) => {
                      if (value) setResult(value);
                    }}
                    aria-label={group.category}
                    sx={{ flexWrap: 'wrap', rowGap: 0.5, columnGap: 0.5 }}
                  >
                    {group.items.map((hit) => (
                      <ToggleButton
                        key={hit}
                        value={hit}
                        size="small"
                        sx={{
                          textTransform: 'none',
                          minHeight: 40,
                          borderColor: getResultColor(hit),
                          color: getResultColor(hit),
                          '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: getResultColor(hit),
                            color: '#fff',
                          },
                        }}
                      >
                        {hitResultLabels[hit]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              ))}
            </Box>
            <FormHelperText id="result-helper-text" error={!result}>
              {result
                ? `選択中: ${hitResultLabels[result]}`
                : '打席の結果をタップして選択してください'}
            </FormHelperText>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="rbi-label">打点</InputLabel>
              <Select
                labelId="rbi-label"
                value={rbi}
                onChange={(e) => setRbi(Number(e.target.value))}
                label="打点"
                aria-describedby="rbi-helper-text"
              >
                <MenuItem value={0}>0</MenuItem>
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4 (グランドスラム)</MenuItem>
              </Select>
              <FormHelperText id="rbi-helper-text">
                この打席で記録した打点を選択
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="詳細メモ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              aria-describedby="description-helper-text"
              helperText="打席の詳細や特記事項を入力（任意）"
              FormHelperTextProps={{
                id: 'description-helper-text',
              }}
            />
          </Grid>

          <Grid item xs={12}>
            {isEditMode ? (
              <Stack direction="row" spacing={2}>
                <Button
                  ref={submitButtonRef}
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={!onUpdateAtBat || !result}
                >
                  更新
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleCancel}
                >
                  キャンセル
                </Button>
              </Stack>
            ) : (
              <Button
                ref={submitButtonRef}
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={!result}
              >
                登録
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default React.memo(AtBatForm);
