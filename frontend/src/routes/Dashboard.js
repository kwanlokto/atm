import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ContentCopy, MoreHoriz } from '@mui/icons-material';
import {
  createNewAccount,
  deleteAccount,
  getAllAccounts,
} from '../data-handler/auth';
import { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import { AppShell } from '../component/AppShell';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { BRAND } from '../theme';
import DeleteIcon from '@mui/icons-material/Delete';
import SavingsIcon from '@mui/icons-material/Savings';
import { useNavigate } from 'react-router-dom';

const fmtUSD = (n) =>
  Number(n).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });

const TYPE_META = {
  checking: {
    label: 'Checking',
    icon: AccountBalanceWalletIcon,
    color: BRAND.navy[700],
    accent: '#E7ECF6',
  },
  savings: {
    label: 'Savings',
    icon: SavingsIcon,
    color: BRAND.emerald[600],
    accent: '#E1F5EE',
  },
};

const AccountCard = ({ account, onOpen, onDelete, onCopy }) => {
  const meta = TYPE_META[account.account_type] || TYPE_META.checking;
  const Icon = meta.icon;
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      <CardActionArea onClick={onOpen} sx={{ p: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            bgcolor: meta.accent,
            opacity: 0.55,
          }}
        />
        <CardContent sx={{ position: 'relative' }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  bgcolor: meta.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {account.name}
                </Typography>
                <Chip
                  size="small"
                  label={meta.label}
                  sx={{
                    bgcolor: meta.accent,
                    color: meta.color,
                    height: 22,
                  }}
                />
              </Box>
            </Stack>
            <Tooltip title="Delete account">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Available balance
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.25 }}>
            {fmtUSD(account.balance)}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                Account no.
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', letterSpacing: 1 }}
              >
                {account.account_number}
              </Typography>
            </Box>
            <Tooltip title="Copy number">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(account.account_number);
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const NewAccountDialog = ({ open, onClose, onCreate, busy }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');

  useEffect(() => {
    if (open) {
      setName('');
      setType('checking');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Open a new account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Account name"
            placeholder="e.g. Vacation Fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || busy}
          onClick={() => onCreate(name.trim(), type)}
        >
          {busy ? 'Creating…' : 'Open account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await getAllAccounts();
      setAccounts(res.data.data);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    const id = setInterval(fetchAccounts, 5000);
    return () => clearInterval(id);
  }, []);

  const handleCreate = async (name, type) => {
    setCreating(true);
    try {
      const res = await createNewAccount(name, type);
      setAccounts((prev) => [...prev, res.data.data]);
      setDialogOpen(false);
    } catch (e) {
      setError(e.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e.message || 'Failed to delete account');
    }
  };

  const handleCopy = async (num) => {
    try {
      await navigator.clipboard.writeText(num);
      setInfo(`Copied ${num}`);
      setTimeout(() => setInfo(''), 1500);
    } catch (_) {}
  };

  const totalBalance = accounts.reduce(
    (sum, a) => sum + Number(a.balance || 0),
    0,
  );
  const checkingTotal = accounts
    .filter((a) => a.account_type === 'checking')
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const savingsTotal = accounts
    .filter((a) => a.account_type === 'savings')
    .reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Net-worth header card */}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            mb: 4,
            color: '#fff',
            backgroundImage: `linear-gradient(135deg, ${BRAND.navy[900]}, ${BRAND.navy[700]} 55%, ${BRAND.navy[600]})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              bgcolor: `${BRAND.emerald[500]}22`,
            }}
          />
          <Box sx={{ position: 'relative' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Total balance
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}
            >
              {fmtUSD(totalBalance)}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
              <SummaryStat label="Checking" value={fmtUSD(checkingTotal)} />
              <SummaryStat label="Savings" value={fmtUSD(savingsTotal)} />
              <SummaryStat
                label="Accounts"
                value={accounts.length.toString()}
              />
            </Stack>
          </Box>
        </Paper>

        {/* Section header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={2}
          spacing={1}
        >
          <Box>
            <Typography variant="h5">Your accounts</Typography>
            <Typography variant="body2" color="text.secondary">
              Tap any card to deposit, withdraw, or transfer.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Open account
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[0, 1, 2].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={210} />
              </Grid>
            ))}
          </Grid>
        ) : accounts.length === 0 ? (
          <Paper
            sx={{
              py: 6,
              textAlign: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <MoreHoriz fontSize="large" color="disabled" />
            <Typography variant="h6" sx={{ mt: 1 }}>
              No accounts yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Open your first account to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Open account
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {accounts.map((acc) => (
              <Grid item xs={12} sm={6} md={4} key={acc.id}>
                <AccountCard
                  account={acc}
                  onOpen={() => navigate(`/account/${acc.id}`)}
                  onDelete={() => handleDelete(acc.id)}
                  onCopy={handleCopy}
                />
              </Grid>
            ))}
          </Grid>
        )}

        <NewAccountDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreate={handleCreate}
          busy={creating}
        />
      </Container>
    </AppShell>
  );
};

const SummaryStat = ({ label, value }) => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        color: 'rgba(255,255,255,0.65)',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
      }}
    >
      {label}
    </Typography>
    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);
