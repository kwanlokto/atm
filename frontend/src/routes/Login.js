import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
  TextField,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

import { AuthLayout } from '../component/AuthLayout';
import { userLogin } from '../data-handler/auth';

export const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await userLogin(email, password);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem('user.token', token);
        navigate('/', { replace: true });
      } else {
        setError('Sign-in succeeded but no token was returned.');
      }
    } catch (err) {
      setError(err.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your accounts."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          margin="normal"
          required
          fullWidth
          label="Email address"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={busy}
          sx={{ mt: 3, mb: 2 }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <MuiLink component={Link} to="/signup" underline="hover">
            Create an account
          </MuiLink>
          <MuiLink href="#" underline="hover" color="text.secondary">
            Forgot password?
          </MuiLink>
        </Box>
      </Box>
    </AuthLayout>
  );
};
