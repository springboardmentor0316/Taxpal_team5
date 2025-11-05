import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './transactions.css';
import {
  deleteTransaction,
  fetchTransactions,
} from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import { useModal } from '../modal/ModalProvider';
import IncomeModal from '../income/incomemodal';
import ExpenseModal from '../expence/expencemodal';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const formatDateTime = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} · ${d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const initialFilters = {
  type: '',
  category: '',
  search: '',
  startDate: '',
  endDate: '',
};

export default function Transactions() {
  const { showToast } = useToast();
  const { confirm } = useModal();
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState(null); // 'income' | 'expense'
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchTransactions({
        ...filters,
        sortBy,
        sortDir,
        page,
        pageSize,
      });
      setTransactions(response.data || []);
      setPagination(response.pagination || { page: 1, totalPages: 1, totalItems: 0 });
    } catch (error) {
      const message = error.message || 'Failed to load transactions';
      showToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortDir, page, pageSize, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleDelete = async (id) => {
    const confirmation = await confirm({
      title: 'Delete transaction',
      message: 'This will permanently remove the transaction from your records.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!confirmation) return;
    try {
      await deleteTransaction(id);
      showToast({ message: 'Transaction deleted' });
      await loadTransactions();
    } catch (error) {
      const message = error.message || 'Failed to delete transaction';
      showToast({ message, type: 'error' });
    }
  };

  const totalPages = pagination.totalPages || 1;

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        if (t.type === 'expense') acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const openCreateModal = (type) => {
    setActiveTransaction(null);
    setModalType(type);
    setModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setActiveTransaction(transaction);
    setModalType(transaction.type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveTransaction(null);
  };

  const handleModalSubmit = async () => {
    await loadTransactions();
    closeModal();
  };

  return (
    <React.Fragment>
      <div className="tx-page">
        <div className="set-head">
          <h2 className="set-title">Transactions</h2>
          <p className="set-sub">All income and expenses with filters and pagination.</p>
        </div>

      <div className="tx-actions">
        <button type="button" className="btn primary sm" onClick={() => openCreateModal('income')}>
          + Record Income
        </button>
        <button type="button" className="btn ghost sm" onClick={() => openCreateModal('expense')}>
          + Record Expense
        </button>
      </div>

      <div className="panel">
        <div className="filters">
          <select name="type" value={filters.type} onChange={onFilterChange} className="filter-field">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <input
            name="category"
            value={filters.category}
            onChange={onFilterChange}
            placeholder="Category"
            className="filter-field"
          />

          <input
            name="search"
            value={filters.search}
            onChange={onFilterChange}
            placeholder="Search description or notes"
            className="filter-field flex"
          />

          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={onFilterChange}
            className="filter-field"
          />

          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={onFilterChange}
            className="filter-field"
          />

          <button type="button" className="btn ghost sm" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="filters secondary">
          <div className="sort-group">
            <label className="sort-label" htmlFor="sortBy">
              Sort by
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="filter-field"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="createdAt">Created time</option>
            </select>

            <select
              value={sortDir}
              onChange={(event) => {
                setSortDir(event.target.value);
                setPage(1);
              }}
              className="filter-field"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="sort-group">
            <label className="sort-label" htmlFor="pageSize">
              Rows
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="filter-field"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="summary-chips">
            <span className="chip good">Income: {currency.format(summary.income)}</span>
            <span className="chip warn">Expenses: {currency.format(summary.expense)}</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Category</th>
                <th>Type</th>
                <th className="right">Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Loading transactions…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="title">{transaction.description}</td>
                    <td className="when">{formatDateTime(transaction.date)}</td>
                    <td className="cat">{transaction.category || '—'}</td>
                    <td className={`type ${transaction.type}`}>
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </td>
                    <td className={`amount right ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {currency.format(Number(transaction.amount || 0))}
                    </td>
                    <td className="notes">{transaction.notes || '—'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="link danger"
                        onClick={() => handleDelete(transaction._id)}
                      >
                        Delete
                      </button>
                      <span className="sep"> · </span>
                      <button type="button" className="link" onClick={() => openEditModal(transaction)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Prev
          </button>
          <span className="page-indicator">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>

      <IncomeModal
        open={modalOpen && modalType === 'income'}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        transaction={modalType === 'income' ? activeTransaction : null}
      />
      <ExpenseModal
        open={modalOpen && modalType === 'expense'}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        transaction={modalType === 'expense' ? activeTransaction : null}
      />
    </React.Fragment>
  );
}
