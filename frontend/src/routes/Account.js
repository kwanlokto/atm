import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  deposit,
  getAccount,
  getAllTransactions,
  transfer,
  withdraw,
} from '../data-handler/auth';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import CloseIcon from '@mui/icons-material/Close';

const formatMoney = (n) =>
  Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const KIND_LABEL = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
};

export const AccountDetail = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [acctRes, txRes] = await Promise.all([
        getAccount(accountId),
        getAllTransactions(accountId, { limit: 50 }),
      ]);
      setAccount(acctRes.data.data);
      setTransactions(txRes.data.data);
    } catch (e) {
      setError(e.message || 'Failed to load account');
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
    // Poll so a concurrent operation by another client shows up quickly.
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [accountId, refresh]);

  const reset = () => {
    setAmount('');
    setDescription('');
    setToAccountNumber('');
  };

  const submit = async () => {
    setError('');
    setSuccess('');
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a positive amount');
      return;
    }
    setBusy(true);
    try {
      if (tab === 0) {
        await deposit(accountId, value, description || undefined);
        setSuccess(`Deposited ${formatMoney(value)}`);
      } else if (tab === 1) {
        await withdraw(accountId, value, description || undefined);
        setSuccess(`Withdrew ${formatMoney(value)}`);
      } else {
        if (!toAccountNumber.trim()) {
          setError('Recipient account number required');
          setBusy(false);
          return;
        }
        await transfer(
          accountId,
          toAccountNumber.trim(),
          value,
          description || undefined,
        );
        setSuccess(
          `Transferred ${formatMoney(value)} to #${toAccountNumber.trim()}`,
        );
      }
      reset();
      await refresh();
    } catch (e) {
      setError(e.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <Box sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5">{account.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Chip
              size="small"
              label={account.account_type}
              sx={{ textTransform: 'capitalize' }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: 'monospace' }}
            >
              #{account.account_number}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={() => navigate('/')}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            Available balance
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5 }}>
            {formatMoney(account.balance)}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }}>
          <Tab label="Deposit" />
          <Tab label="Withdraw" />
          <Tab label="Transfer" />
        </Tabs>
        <Divider />
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tab === 2 && (
              <TextField
                label="Recipient account number"
                value={toAccountNumber}
                onChange={(e) => setToAccountNumber(e.target.value)}
                inputProps={{ inputMode: 'numeric', maxLength: 16 }}
                fullWidth
              />
            )}
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              fullWidth
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={submit}
              disabled={busy || !amount}
            >
              {busy
                ? 'Processing…'
                : tab === 0
                ? 'Deposit'
                : tab === 1
                ? 'Withdraw'
                : 'Send Transfer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Recent transactions
      </Typography>
      <Card>
        <List>
          {transactions.length === 0 && (
            <ListItem>
              <ListItemText primary="No transactions yet" />
            </ListItem>
          )}
          {transactions.map((t) => {
            const signed = Number(t.amount);
            const sign = signed >= 0 ? '+' : '−';
            return (
              <ListItem key={t.id} divider>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {KIND_LABEL[t.kind] || t.kind}
                        {t.description ? ` — ${t.description}` : ''}
                      </span>
                      <span
                        style={{
                          color: signed >= 0 ? '#2e7d32' : '#c62828',
                        }}
                      >
                        {sign}
                        {formatMoney(Math.abs(signed))}
                      </span>
                    </Box>
                  }
                  secondary={
                    <>
                      {new Date(t.created_at).toLocaleString()} · balance after{' '}
                      {formatMoney(t.balance_after)}
                      {t.transfer_id ? ` · transfer ${t.transfer_id.slice(0, 8)}` : ''}
                    </>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Card>
    </Box>
  );
};
