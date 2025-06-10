'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import Link from 'next/link';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B5E20',
    },
    secondary: {
      main: '#2E7D32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppBar position="static">
            <Toolbar>
              <Link href="/" style={{ textDecoration: 'none', color: 'white' }}>
                <Typography variant="h6" component="div">
                  Sahih al-Bukhari
                </Typography>
              </Link>
            </Toolbar>
          </AppBar>
          <Container component="main">
            {children}
          </Container>
        </ThemeProvider>
      </body>
    </html>
  );
} 