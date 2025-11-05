const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const authHeaders = () => {
  const token = localStorage.getItem('taxpal_token');
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
        ...(!options.skipAuth ? authHeaders() : {}),
      },
    });
  } catch (networkError) {
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.details = data.errors || null;
    throw error;
  }

  return data;
};

export const signup = (payload) =>
  request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const login = (payload) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const forgotPassword = (payload) =>
  request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const verifyResetCode = (payload) =>
  request('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const resetPassword = (payload) =>
  request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const changePassword = (payload) =>
  request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteAccount = () =>
  request('/auth/account', {
    method: 'DELETE',
  });

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null || value === '') {
      return;
    }
    query.append(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export const fetchTransactions = (params) =>
  request(`/transactions${toQueryString(params)}`);

export const fetchTransactionSummary = () =>
  request('/transactions/summary');

export const createTransaction = (payload) =>
  request('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTransaction = (id, payload) =>
  request(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteTransaction = (id) =>
  request(`/transactions/${id}`, {
    method: 'DELETE',
  });

export const fetchBudgets = (params) =>
  request(`/budgets${toQueryString(params)}`);

export const createBudget = (payload) =>
  request('/budgets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateBudget = (id, payload) =>
  request(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteBudget = (id) =>
  request(`/budgets/${id}`, {
    method: 'DELETE',
  });

export const fetchCategories = () => request('/categories');

export const createCategory = (payload) =>
  request('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCategory = (id, payload) =>
  request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteCategory = (id) =>
  request(`/categories/${id}`, {
    method: 'DELETE',
  });

export const fetchTaxEstimates = () => request('/tax-estimates');

export const saveTaxEstimate = (payload) =>
  request('/tax-estimates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteTaxEstimate = (id) =>
  request(`/tax-estimates/${id}`, {
    method: 'DELETE',
  });

export const fetchReports = (params) => request(`/reports${toQueryString(params)}`);

export const createReport = (payload) =>
  request('/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteReport = (id) =>
  request(`/reports/${id}`, {
    method: 'DELETE',
  });

const api = {
  signup,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  deleteAccount,
  fetchTransactions,
  fetchTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchTaxEstimates,
  saveTaxEstimate,
  deleteTaxEstimate,
  fetchReports,
  createReport,
  deleteReport,
};

export default api;
