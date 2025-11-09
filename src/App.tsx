import React, { useMemo, useState } from 'react';
import { CssBaseline, PaletteMode, ThemeProvider } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { createAppTheme } from './theme';
import MainApp from './MainApp';

const App: React.FC = () => {
  const [mode, setMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MainApp toggleColorMode={toggleColorMode} mode={mode} />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
