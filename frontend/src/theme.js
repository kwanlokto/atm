import { createTheme } from '@mui/material/styles';

const navy = {
  900: '#0A1F44',
  800: '#0D2A5C',
  700: '#143575',
  600: '#1E4391',
  500: '#3056A8',
};

const emerald = {
  600: '#0E8A6A',
  500: '#12A881',
  400: '#2DC196',
};

const ink = {
  900: '#0B1220',
  700: '#1F2A3D',
  500: '#5A657A',
  300: '#A1ABBF',
};

const surface = {
  page: '#F4F6FB',
  card: '#FFFFFF',
  muted: '#EEF1F7',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: navy[800], dark: navy[900], light: navy[600] },
    secondary: { main: emerald[500], dark: emerald[600], light: emerald[400] },
    success: { main: emerald[600] },
    error: { main: '#C0392B' },
    warning: { main: '#D68910' },
    background: { default: surface.page, paper: surface.card },
    text: { primary: ink[900], secondary: ink[500] },
    divider: '#E3E8F0',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 18, paddingBlock: 10 },
        containedPrimary: {
          boxShadow: '0 8px 24px -12px rgba(13, 42, 92, 0.55)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.08)',
          border: '1px solid #E3E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10, backgroundColor: '#fff' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(95deg, ${navy[900]} 0%, ${navy[700]} 60%, ${navy[600]} 100%)`,
        },
      },
    },
  },
});

export const BRAND = {
  name: 'Meridian',
  tagline: 'Banking, on a higher plane.',
  navy,
  emerald,
};
