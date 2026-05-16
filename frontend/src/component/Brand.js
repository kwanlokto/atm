import { Box, Typography } from '@mui/material';

import { BRAND } from '../theme';
import React from 'react';

/**
 * Inline SVG mark for Meridian — a stylized "M" inside a navy hexagon
 * with an emerald spark. Self-contained so we don't need an asset pipeline.
 */
export const BrandMark = ({ size = 36 }) => (
  <Box
    component="svg"
    viewBox="0 0 40 40"
    sx={{ width: size, height: size, display: 'block' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={BRAND.navy[700]} />
        <stop offset="100%" stopColor={BRAND.navy[900]} />
      </linearGradient>
    </defs>
    <path
      d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
      fill="url(#brand-grad)"
    />
    <path
      d="M11 28 L11 14 L20 22 L29 14 L29 28"
      stroke="#FFFFFF"
      strokeWidth="2.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="30" cy="11" r="3" fill={BRAND.emerald[400]} />
  </Box>
);

export const Brand = ({ variant = 'dark', size = 32 }) => {
  const color = variant === 'light' ? '#fff' : BRAND.navy[900];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <BrandMark size={size} />
      <Box>
        <Typography
          variant="h6"
          sx={{
            color,
            lineHeight: 1,
            letterSpacing: '0.04em',
            fontWeight: 700,
          }}
        >
          MERIDIAN
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: variant === 'light' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontSize: 10,
          }}
        >
          Private Banking
        </Typography>
      </Box>
    </Box>
  );
};
