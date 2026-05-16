import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Link as MuiLink,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import {
  deposit,
  getAccount,
  getAllTransactions,
  transfer,
  withdraw,
} from '../data-handler/auth';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { AppShell } from '../component/AppShell';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { BRAND } from '../theme';
import { ContentCopy } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import SavingsIcon from '@mui/icons-material/Savings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const fmtUSD = (n) =>
  Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const TYPE_META = {
  checking: { label: 'Checking', icon: AccountBalanceWalletIcon, color: BRAND.navy[700] },
  savings: { label: 'Savings', icon: SavingsIcon, color: BRAND.emerald[600] },
};

const TXN_META = {
  deposit: {
    label: 'Deposit',
    icon: ArrowDownwardIcon,
    color: BRAND.emerald[600],
    bg: '#E1F5EE',
    sign: '+',
  },
  withdrawal: {
    label: 'Withdrawal',
    icon: ArrowUpwardIcon,
    color: '#C0392B',
    bg: '#FCE7E2',
    sign: '−',
  },
  transfer_in: {
    label: 'Transfer in',
    icon: SwapHorizIcon,
    color: BRAND.emerald[600],
    bg: '#E1F5EE',
    sign: '+',
  },
  transfer_out: {
    label: 'Transfer out',
    icon: SwapHorizIcon,
    color: BRAND.navy[700],
    bg: '#E7ECF6',
    sign: '−',
  },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const TransactionRow = ({ t }) => {
  const meta = TXN_META[t.kind] || TXN_META.deposit;
  const Icon = meta.icon;
  const signed = Number(t.amount);
  return (
    <ListItem
      divider
      secondaryAction={
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: meta.color }}
          >
            {meta.sign}
            {fmtUSD(Math.abs(signed))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            balance {fmtUSD(t.balance_after)}
          </Typography>
        </Box>
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: meta.bg, color: meta.color }}>
          <Icon fontSize="small" />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {meta.label}
            {t.description ? ` — ${t.description}` : ''}
          </Typography>
        }
        secondary={
          <>
            {formatDate(t.created_at)}
            {t.transfer_id ? ` · transfer ${t.transfer_id.slice(0, 8)}` : ''}
          </>
        }
      />
    </ListItem>
  );
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
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
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
        setSuccess(`Deposited ${fmtUSD(value)}`);
      } else if (tab === 1) {
        await withdraw(accountId, value, description || undefined);
        setSuccess(`Withdrew ${fmtUSD(value)}`);
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
          `Transferred ${fmtUSD(value)} to #${toAccountNumber.trim()}`,
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
      <AppShell>
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={400} />
        </Container>
      </AppShell>
    );
  }

  const meta = TYPE_META[account.account_type] || TYPE_META.checking;
  const TypeIcon = meta.icon;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(account.account_number);
      setSuccess('Account number copied');
      setTimeout(() => setSuccess(''), 1500);
    } catch (_) {}
  };

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <MuiLink component={Link} to="/" underline="hover" color="text.secondary">
            Accounts
          </MuiLink>
          <Typography color="text.primary">{account.name}</Typography>
        </Breadcrumbs>

        {/* Header card */}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            color: '#fff',
            backgroundImage: `linear-gradient(135deg, ${meta.color}, ${BRAND.navy[900]})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              right: -60,
              bottom: -60,
              width: 220,
              height: 220,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.07)',
            }}
          />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
            sx={{ position: 'relative' }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.18)',
                  width: 56,
                  height: 56,
                }}
              >
                <TypeIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff' }}>
                  {account.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                  <Chip
                    size="small"
                    label={meta.label}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      fontFamily: 'monospace',
                      letterSpacing: 1,
                    }}
                  >
                    #{account.account_number}
                  </Typography>
                  <Tooltip title="Copy number">
                    <IconButton
                      size="small"
                      onClick={copyNumber}
                      sx={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Stack>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                }}
              >
                Available balance
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff' }}>
                {fmtUSD(account.balance)}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card>
              <Tabs
                value={tab}
                onChange={(_, v) => {
                  setTab(v);
                  setError('');
                  setSuccess('');
                }}
                variant="fullWidth"
              >
                <Tab icon={<ArrowDownwardIcon />} iconPosition="start" label="Deposit" />
                <Tab icon={<ArrowUpwardIcon />} iconPosition="start" label="Withdraw" />
                <Tab icon={<SwapHorizIcon />} iconPosition="start" label="Transfer" />
              </Tabs>
              <Divider />
              <CardContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                <Stack spacing={2}>
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
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
                    size="large"
                    onClick={submit}
                    disabled={busy || !amount}
                  >
                    {busy
                      ? 'Processing…'
                      : tab === 0
                      ? `Deposit ${amount ? fmtUSD(amount) : ''}`
                      : tab === 1
                      ? `Withdraw ${amount ? fmtUSD(amount) : ''}`
                      : `Send ${amount ? fmtUSD(amount) : 'transfer'}`}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Every request is sent with a unique Idempotency-Key so retries
                    never double-post.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent sx={{ pb: 0 }}>
                <Typography variant="h6">Recent activity</Typography>
                <Typography variant="body2" color="text.secondary">
                  Updates every few seconds across all connected devices.
                </Typography>
              </CardContent>
              <List sx={{ pt: 1 }}>
                {transactions.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No transactions yet"
                      secondary="Make a deposit to see your first activity."
                    />
                  </ListItem>
                )}
                {transactions.map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
              </List>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </AppShell>
  );
};
