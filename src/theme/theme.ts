import { createTheme, type Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

export function buildTheme(mode: ColorMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#1565c0' },
      secondary: { main: '#00897b' },
      success: { main: '#2e7d32' },
      warning: { main: '#ed6c02' },
      error: { main: '#d32f2f' },
      info: { main: '#0288d1' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Roboto, system-ui, Arial, sans-serif',
    },
  });
}
