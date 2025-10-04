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
    },
    accessibility: accessibilityTokens,
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: theme.accessibility.touchTarget.minHeight,
            minWidth: theme.accessibility.touchTarget.minWidth,
            '&:focus-visible': {
              outline: `${theme.accessibility.focusVisible.outline} ${theme.palette.primary.main}`,
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
              outline: `${theme.accessibility.focusVisible.outline} ${theme.palette.primary.main}`,
              outlineOffset: theme.accessibility.focusVisible.outlineOffset,
            },
          }),
        },
      },
    },
  });
