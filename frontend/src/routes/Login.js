import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { makeStyles } from '@mui/styles';
import { Link, useNavigate } from 'react-router-dom';
import { userLogin } from '../data-handler/auth';
import { useState } from 'react';

const useStyles = makeStyles(() => ({
  paper: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  form: { width: '100%', marginTop: 1 },
}));

export const Login = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await userLogin(email, password);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem('user.token', token);
        navigate('/', { replace: true });
      } else {
        console.error('No token returned from login', res);
      }
    } catch (err) {
      console.error('Login error', err);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box className={classes.paper}>
        <Avatar sx={{ m: 1 }} />
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          className={classes.form}
          noValidate
        >
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
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
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link to="/signup">Don't have an account? Sign Up</Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};
