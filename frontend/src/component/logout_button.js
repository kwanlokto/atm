import React from 'react';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { userLogout } from '../data-handler/auth';

export const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await userLogout();
    } catch (e) {
      // Even if the server call fails (network, expired token), wipe the local
      // token so the UI returns to a logged-out state.
    }
    localStorage.removeItem('user.token');
    navigate('/login', { replace: true });
  };

  return (
    <Button onClick={handleLogout} variant="outlined">
      Logout
    </Button>
  );
};
