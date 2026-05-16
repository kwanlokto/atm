import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { AccountDetail } from './routes/Account';
import CssBaseline from '@mui/material/CssBaseline';
import { Dashboard } from './routes/Dashboard';
import { Login } from './routes/Login';
import { ProtectedRoute } from './routes/ProtectedRoute';
import React from 'react';
import { SignUp } from './routes/SignUp';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/account/:accountId" element={<AccountDetail />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
