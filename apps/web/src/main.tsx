import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#08786e', light: '#e6f4f2', dark: '#065c56' },
    secondary: { main: '#e6613d' },
    background: { default: '#f4f7f6', paper: '#ffffff' },
    success: { main: '#1f8a68' },
    warning: { main: '#d9822b' },
    error: { main: '#d64234' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Roboto, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Roboto, "Segoe UI", sans-serif', fontWeight: 700 },
    h2: { fontFamily: 'Roboto, "Segoe UI", sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Roboto, "Segoe UI", sans-serif', fontWeight: 700 },
    h4: { fontFamily: 'Roboto, "Segoe UI", sans-serif', fontWeight: 700 },
    h5: { fontFamily: 'Roboto, "Segoe UI", sans-serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 40,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
