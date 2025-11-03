import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AccountDetail } from './routes/Account';
import { Dashboard } from './routes/Dashboard';
import { Login } from './routes/Login';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { SignUp } from './routes/SignUp';

export default function App() {
  return (
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
  );
}
