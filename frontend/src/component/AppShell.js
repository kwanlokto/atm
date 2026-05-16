import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import { Brand } from './Brand';
import LogoutIcon from '@mui/icons-material/Logout';
import { getCurrentUser } from '../data-handler/auth';
import { useNavigate } from 'react-router-dom';
import { userLogout } from '../data-handler/auth';

const initialsOf = (user) => {
  if (!user) return '?';
  const f = (user.first_name || '').trim()[0] || '';
  const l = (user.last_name || '').trim()[0] || '';
  return (f + l).toUpperCase() || (user.email?.[0] || '?').toUpperCase();
};

export const AppShell = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((res) => {
        if (!cancelled) setUser(res.data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    try {
      await userLogout();
    } catch (_) {}
    localStorage.removeItem('user.token');
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: 72, gap: 2 }}>
          <Box
            sx={{ cursor: 'pointer', display: 'flex' }}
            onClick={() => navigate('/')}
          >
            <Brand variant="light" size={32} />
          </Box>
          <Box sx={{ flex: 1 }} />
          {user && (
            <Tooltip title={`${user.first_name} ${user.last_name}`}>
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Hi, {user.first_name}
                </Typography>
              </Box>
            </Tooltip>
          )}
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                color: 'primary.dark',
                fontWeight: 700,
                width: 38,
                height: 38,
              }}
            >
              {initialsOf(user)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {user && (
              <MenuItem disabled>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </MenuItem>
            )}
            <MenuItem onClick={logout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="main">{children}</Box>
      <Box
        component="footer"
        sx={{
          py: 4,
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: 12,
        }}
      >
        Meridian Private Banking · Member FDIC (demo) ·{' '}
        © {new Date().getFullYear()}
      </Box>
    </Box>
  );
};
