import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';

function Navbar() {
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <MenuBookIcon sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Sahih al-Bukhari
          </Typography>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
          >
            Books
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar; 