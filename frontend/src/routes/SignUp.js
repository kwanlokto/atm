import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { makeStyles } from '@mui/styles';
import { userSignup } from '../data-handler/auth';

const useStyles = makeStyles(() => ({
  paper: { marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  form: { width: '100%', marginTop: 1 }
}));

export const SignUp = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const signUp = async (e) => {
    e.preventDefault();
    try {
      const res = await userSignup(email, password, firstName, lastName);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem('user.token', token);
      }
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Sign up failed', err);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box className={classes.paper}>
        <Avatar sx={{ m: 1 }} />
        <Typography component="h1" variant="h5">Sign up</Typography>
        <Box component="form" onSubmit={signUp} className={classes.form} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField autoComplete="given-name" name="firstName" required fullWidth label="First Name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Last Name" name="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth label="Email Address" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Grid>
          </Grid>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Sign Up</Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link to="/login">Already have an account? Sign in</Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};
