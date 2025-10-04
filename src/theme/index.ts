import { PaletteMode } from '@mui/material';
import { getNewTheme } from './tokens';

export const createAppTheme = (mode: PaletteMode) => getNewTheme(mode);
