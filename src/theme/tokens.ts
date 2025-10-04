import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    accessibility: {
      focusVisible: {
        outline: string;
        outlineOffset: string;
        borderRadius: string;
      };
      touchTarget: {
        minHeight: string;
        minWidth: string;
      };
    };
  }
  interface ThemeOptions {
    accessibility?: {
      focusVisible?: {
        outline?: string;
        outlineOffset?: string;
        borderRadius?: string;
      };
      touchTarget?: {
        minHeight?: string;
        minWidth?: string;
      };
    };
  }
}

export const accessibilityTokens: ThemeOptions['accessibility'] = {
  focusVisible: {
    outline: '2px solid',
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  touchTarget: {
    minHeight: '48px',
    minWidth: '48px',
  },
};

export const getNewTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2', // アプリのブランドカラー（例: ブルー系）
      },
      secondary: {
        main: '#dc004e', // アクセントカラー（例: ピンク系）
      },
      ...(mode === 'dark' && {
        background: {
          default: '#121212',
          paper: '#1e1e1e',
        },
      }),
    },
    accessibility: accessibilityTokens,
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: theme.accessibility.touchTarget.minHeight,
            minWidth: theme.accessibility.touchTarget.minWidth,
            '&:focus-visible': {
              outline: `${theme.accessibility.focusVisible.outline} ${
                theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main
              }`,
              outlineOffset: theme.accessibility.focusVisible.outlineOffset,
              borderRadius: theme.accessibility.focusVisible.borderRadius,
            },
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: theme.accessibility.touchTarget.minHeight,
            minWidth: theme.accessibility.touchTarget.minWidth,
            '&:focus-visible': {
              outline: `${theme.accessibility.focusVisible.outline} ${
                theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main
              }`,
              outlineOffset: theme.accessibility.focusVisible.outlineOffset,
            },
          }),
        },
      },
    },
  });
