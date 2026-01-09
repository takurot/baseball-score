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

// Phase 1: New color palette
const primaryColor = '#2563EB'; // Blue 600
const secondaryColor = '#7C3AED'; // Violet 600

export const getNewTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        light: '#3B82F6', // Blue 500
        dark: '#1D4ED8', // Blue 700
      },
      secondary: {
        main: secondaryColor,
        light: '#8B5CF6', // Violet 500
        dark: '#6D28D9', // Violet 700
      },
      ...(mode === 'dark' && {
        background: {
          default: '#0F172A', // Slate 900
          paper: '#1E293B', // Slate 800
        },
      }),
    },
    typography: {
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 700,
      },
      h2: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 700,
      },
      h3: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 600,
      },
      h4: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 600,
      },
      h5: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 600,
      },
      h6: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontWeight: 600,
      },
      button: {
        fontWeight: 500,
        textTransform: 'none', // Keep button text as-is (no uppercase)
      },
    },
    accessibility: accessibilityTokens,
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: theme.accessibility.touchTarget.minHeight,
            minWidth: theme.accessibility.touchTarget.minWidth,
            borderRadius: '8px',
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
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
          },
        },
      },
    },
  });
