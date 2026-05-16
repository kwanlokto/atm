import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  createNewAccount,
  deleteAccount,
  getAllAccounts,
} from '../data-handler/auth';
import { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { LogoutButton } from '../component/logout_button';
import { useNavigate } from 'react-router-dom';

const formatBalance = (balance) =>
  Number(balance).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });

export const Dashboard = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllAccounts();
      setAccounts(res.data.data);
    } catch (e) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 5000); // refresh every 5s so a teller in another window appears
    return () => clearInterval(interval);
  }, []);

  const createAccount = async () => {
    if (!newAccountName.trim()) return;
    try {
      const res = await createNewAccount(newAccountName, newAccountType);
      setAccounts((prev) => [...prev, res.data.data]);
      setNewAccountName('');
      setNewAccountType('checking');
    } catch (e) {
      setError(e.message || 'Failed to create account');
    }
  };

  const removeAccount = async (accountId) => {
    try {
      await deleteAccount(accountId);
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    } catch (e) {
      setError(e.message || 'Failed to delete account');
    }
  };

  return (
    <Box sx={{ pt: 6, pb: 6, maxWidth: 1100, mx: 'auto', px: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={500}>
          Your Accounts
        </Typography>
        <LogoutButton />
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading && accounts.length === 0 ? (
        <Typography color="text.secondary">Loading accounts…</Typography>
      ) : (
        <Grid container spacing={3}>
          {accounts.map(
            ({ id, name, balance, account_number, account_type }) => (
              <Grid item xs={12} sm={6} md={4} key={id}>
                <Card
                  onClick={() => navigate(`/account/${id}`)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    boxShadow: 2,
                    transition: 'transform 0.15s ease-in-out',
                    '&:hover': { transform: 'scale(1.02)', boxShadow: 4 },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" fontWeight={500}>
                        {name}
                      </Typography>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAccount(id);
                        }}
                        size="small"
                        aria-label="delete account"
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Box>
                    <Chip
                      size="small"
                      label={account_type}
                      sx={{ mb: 1, textTransform: 'capitalize' }}
                    />
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      #{account_number}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>
                      {formatBalance(balance)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ),
          )}
        </Grid>
      )}

      <Box
        sx={{
          mt: 5,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          label="New account name"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          variant="outlined"
          size="medium"
          sx={{ maxWidth: 320, flex: 1 }}
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
          >
            <MenuItem value="checking">Checking</MenuItem>
            <MenuItem value="savings">Savings</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createAccount}
          disabled={!newAccountName.trim()}
          sx={{ height: 56 }}
        >
          Open Account
        </Button>
      </Box>
    </Box>
  );
};
