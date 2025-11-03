import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';

export const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user.token');
    navigate('/login', { replace: true });
  };

  return (
    <Button onClick={handleLogout} variant="outlined">
      Logout
    </Button>
  );
};
