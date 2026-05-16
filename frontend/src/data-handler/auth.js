import { axios_delete, axios_get, axios_post } from './base';

/* ----------- User ----------- */
export const userLogin = (email, password) =>
  axios_post('/user/login', { email, password });

export const userSignup = (email, password, firstName, lastName) =>
  axios_post('/user/signup', {
    first_name: firstName,
    last_name: lastName,
    email,
    password,
  });

export const userLogout = () => axios_post('/user/logout');

export const getCurrentUser = () => axios_get('/user/me');

/* ----------- Accounts ----------- */
export const getAllAccounts = () => axios_get('/account');

export const getAccount = (accountId) => axios_get(`/account/${accountId}`);

export const createNewAccount = (name, accountType = 'checking') =>
  axios_post('/account', { name, account_type: accountType });

export const deleteAccount = (accountId) =>
  axios_delete(`/account/${accountId}`);

/* ----------- Transactions ----------- */
const idem = () => ({ 'Idempotency-Key': crypto.randomUUID() });

export const getAllTransactions = (accountId, { limit = 50, kind } = {}) => {
  const params = { limit };
  if (kind) params.kind = kind;
  return axios_get(`/account/${accountId}/transaction`, params);
};

export const deposit = (accountId, amount, description) =>
  axios_post(
    `/account/${accountId}/deposit`,
    { amount, description },
    {},
    idem(),
  );

export const withdraw = (accountId, amount, description) =>
  axios_post(
    `/account/${accountId}/withdraw`,
    { amount, description },
    {},
    idem(),
  );

export const transfer = (accountId, toAccountNumber, amount, description) =>
  axios_post(
    `/account/${accountId}/transfer`,
    { to_account_number: toAccountNumber, amount, description },
    {},
    idem(),
  );
