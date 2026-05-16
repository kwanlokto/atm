import { Link, Typography } from '@mui/material';

import React from 'react';

export const Copyright = () => (
  <Typography variant="body2" color="text.secondary" align="center">
    {'Copyright © '}
    <Link color="inherit" href="#">
      Meridian Private Banking
    </Link>{' '}
    {new Date().getFullYear()}
  </Typography>
);
