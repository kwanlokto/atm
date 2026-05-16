import {
  Alert,
  Box,
  Button,
  Grid,
  Link as MuiLink,
  TextField,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

import { AuthLayout } from '../component/AuthLayout';
import { userSignup } from '../data-handler/auth';

export const SignUp = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signUp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await userSignup(email, password, firstName, lastName);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem('user.token', token);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Open your account"
      subtitle="Free to open. You'll get a starter checking account instantly."
    >
      <Box component="form" onSubmit={signUp} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="First name"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Grid>
        </Grid>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={busy}
          sx={{ mt: 3, mb: 2 }}
        >
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <MuiLink component={Link} to="/login" underline="hover">
            Already have an account? Sign in
          </MuiLink>
        </Box>
      </Box>
    </AuthLayout>
  );
};
