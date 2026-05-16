import { Box, Paper, Typography } from '@mui/material';

import { BRAND } from '../theme';
import { Brand } from './Brand';
import React from 'react';

/**
 * Split layout: branded hero on the left (hidden on small screens),
 * the form on the right. Used by both Login and SignUp.
 */
export const AuthLayout = ({ title, subtitle, children }) => (
  <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
    <Box
      sx={{
        flex: 1.1,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 6,
        color: '#fff',
        backgroundImage: `radial-gradient(circle at 20% 20%, ${BRAND.navy[600]}, transparent 60%), radial-gradient(circle at 80% 80%, ${BRAND.emerald[600]}33, transparent 50%), linear-gradient(135deg, ${BRAND.navy[900]}, ${BRAND.navy[700]})`,
      }}
    >
      <Brand variant="light" size={40} />
      <Box>
        <Typography variant="h3" sx={{ maxWidth: 460, mb: 2 }}>
          {BRAND.tagline}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.75)', maxWidth: 480 }}
        >
          Checking, savings, and instant transfers across every account you
          own — backed by bank-grade Postgres ledgers and clean, auditable
          history on every dollar.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 4, opacity: 0.85 }}>
        <Feature label="Instant" value="transfers" />
        <Feature label="Atomic" value="ledger" />
        <Feature label="Idempotent" value="writes" />
      </Box>
    </Box>

    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, md: 6 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          width: '100%',
          maxWidth: 440,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: { md: 'none' }, mb: 3 }}>
          <Brand variant="dark" size={36} />
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Paper>
    </Box>
  </Box>
);

const Feature = ({ label, value }) => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
      }}
    >
      {label}
    </Typography>
    <Typography variant="h6" sx={{ color: '#fff' }}>
      {value}
    </Typography>
  </Box>
);
