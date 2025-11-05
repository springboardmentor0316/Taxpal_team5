import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  fetchCategories,
} from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import { useModal } from '../modal/ModalProvider';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import './budgets.css';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const currentMonthISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (iso) => {
  if (!iso) return '—';
  const [year, month] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const chipClass = (status) => {
  if (status === 'Good') return 'chip good';
  if (status === 'Warning') return 'chip warn';
  if (status === 'Bad') return 'chip bad';
  return 'chip';
};

const initialFormState = {
  category: '',
  limit: '',
  month: currentMonthISO(),
  note: '',
};

export default function Budgets() {
  const { showToast } = useToast();
  const { confirm } = useModal();
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({ totalLimit: 0, totalSpent: 0, totalRemaining: 0, health: 'Good' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO());
  const [availableMonths, setAvailableMonths] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editing, setEditing] = useState(null); // { id, category, limit, month, note }
  const loadCategoriesList = useCallback(async () => {
    try {
      const response = await fetchCategories();
      const expenseCategories = Array.isArray(response.expense)
        ? response.expense
        : [];
      setCategories(expenseCategories);
    } catch (error) {
      console.error(error);
      showToast({ message: 'Failed to load categories', type: 'error' });
    }
  }, [showToast]);

  useEffect(() => {
    loadCategoriesList();
  }, [loadCategoriesList]);

  useEffect(() => {
    const handler = () => loadCategoriesList();
    window.addEventListener('taxpal:categories-updated', handler);
    return () => window.removeEventListener('taxpal:categories-updated', handler);
  }, [loadCategoriesList]);

  useEffect(() => {
    setForm((prev) => {
      if (!categories.length) {
        return { ...prev, category: '' };
      }
      if (prev.category && categories.some((cat) => cat.name === prev.category)) {
        return prev;
      }
      return { ...prev, category: categories[0].name };
    });
  }, [categories]);

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedMonth ? { month: selectedMonth } : {};
      const response = await fetchBudgets(params);
      setBudgets(response.budgets || []);
      setSummary(
        response.summary || {
          totalLimit: 0,
          totalSpent: 0,
          totalRemaining: 0,
          health: 'Good',
        }
      );
      const months = new Set(response.budgets?.map((b) => b.month) || []);
      setAvailableMonths(Array.from(months).sort());
    } catch (error) {
      const message = error.message || 'Failed to load budgets';
      showToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, month: selectedMonth || currentMonthISO() }));
  }, [selectedMonth]);

  const chartData = useMemo(
    () =>
      budgets.map((budget) => ({
        category: budget.category,
        Limit: Number(budget.limit || 0),
        Spent: Number(budget.spent || 0),
      })),
    [budgets]
  );

  const enhancedBudgets = useMemo(
    () =>
      budgets.map((budget) => {
        const limit = Number(budget.limit || 0);
        const spent = Number(budget.spent || 0);
        const remaining = Number(budget.remaining ?? Math.max(0, limit - spent));
        const progress = limit > 0 ? Math.min(100, (spent / limit) * 100) : spent > 0 ? 100 : 0;
        let status = budget.status;
        if (!status) {
          status = progress < 80 ? 'Good' : progress <= 100 ? 'Warning' : 'Bad';
        }
        return {
          ...budget,
          limit,
          spent,
          remaining,
          progress,
          status,
        };
      }),
    [budgets]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

const resetForm = (monthValue) => {
  const targetMonth = monthValue || selectedMonth || currentMonthISO();
  setForm({ category: categories[0]?.name || '', limit: '', month: targetMonth, note: '' });
};

  const handleCreate = async (event) => {
    event.preventDefault();
    const trimmedCategory = form.category.trim();
    if (!trimmedCategory || !form.limit) {
      showToast({ message: 'Category and limit are required', type: 'warning' });
      return;
    }

    if (!categories.some((cat) => cat.name === trimmedCategory)) {
      showToast({ message: 'Pick a category from your expense list', type: 'warning' });
      return;
    }

    const limitValue = Number(form.limit);
    if (!Number.isFinite(limitValue) || limitValue < 0) {
      showToast({ message: 'Limit must be a positive number', type: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const targetMonth = form.month;
      await createBudget({
        category: trimmedCategory,
        limit: limitValue,
        month: form.month,
        note: form.note.trim() || undefined,
      });
      showToast({ message: 'Budget created successfully' });
      setSelectedMonth(targetMonth);
      resetForm(targetMonth);
      await loadBudgets();
    } catch (error) {
      const message = error.message || 'Failed to create budget';
      showToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (budget) => {
    setEditing({
      id: budget._id,
      category: budget.category,
      limit: String(budget.limit),
      month: budget.month,
      note: budget.note || '',
    });
  };

  const cancelEdit = () => setEditing(null);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditing((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const trimmedCategory = editing.category.trim();
    if (!trimmedCategory || !editing.limit) {
      showToast({ message: 'Category and limit are required', type: 'warning' });
      return;
    }

    if (categories.length > 0 && !categories.some((cat) => cat.name === trimmedCategory)) {
      showToast({ message: 'Select a category from your expense list', type: 'warning' });
      return;
    }

    const limitValue = Number(editing.limit);
    if (!Number.isFinite(limitValue) || limitValue < 0) {
      showToast({ message: 'Limit must be a positive number', type: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const targetMonth = editing.month;
      await updateBudget(editing.id, {
        category: trimmedCategory,
        limit: limitValue,
        month: editing.month,
        note: editing.note.trim() || undefined,
      });
      showToast({ message: 'Budget updated successfully' });
      setEditing(null);
      setSelectedMonth(targetMonth);
      await loadBudgets();
    } catch (error) {
      const message = error.message || 'Failed to update budget';
      showToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeBudget = async (id) => {
    const confirmed = await confirm({
      title: 'Delete budget entry',
      message: 'This category budget will be removed for the selected month.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteBudget(id);
      showToast({ message: 'Budget deleted successfully' });
      setEditing((prev) => (prev?.id === id ? null : prev));
      await loadBudgets();
    } catch (error) {
      const message = error.message || 'Failed to delete budget';
      showToast({ message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    await removeBudget(id);
  };

  const healthChipClass = chipClass(summary.health);

  return (
    <div className="budgets-wrap">
      <div className="panel">
        <div className="set-head compact between">
          <div className="set-head compact">
            <h2 className="set-title">Create New Budget</h2>
            <p className="set-sub">Define a monthly amount per category.</p>
          </div>
          <div className="budget-health">
            <span className="muted">Budget Health</span>
            <span className={healthChipClass}>{summary.health}</span>
          </div>
        </div>
        <hr />
        <form className="budget-grid" onSubmit={handleCreate}>
          <label className="set-field">
            <span className="set-label">Category</span>
            <input
              list="budgetCategoryOptions"
              name="category"
              value={form.category}
              onChange={handleFormChange}
              placeholder="e.g., Marketing"
            />
            <datalist id="budgetCategoryOptions">
              {categories.map((category) => (
                <option key={`${category.type}-${category.name}`} value={category.name} />
              ))}
            </datalist>
            <div className={`category-hint ${categories.length === 0 ? 'warning' : ''}`}>
              {categories.length === 0
                ? 'Add expense categories in Settings before creating a budget.'
                : 'Only your expense categories are available for budgets.'}
            </div>
          </label>

          <label className="set-field">
            <span className="set-label">Budget Amount</span>
            <input
              name="limit"
              type="number"
              min="0"
              step="0.01"
              placeholder="₹ 0.00"
              value={form.limit}
              onChange={handleFormChange}
            />
          </label>

          <label className="set-field">
            <span className="set-label">Month</span>
            <input
              type="month"
              name="month"
              value={form.month}
              onChange={handleFormChange}
            />
          </label>

          <label className="set-field span-2">
            <span className="set-label">Description (Optional)</span>
            <textarea
              name="note"
              rows={3}
              placeholder="Add any additional details..."
              value={form.note}
              onChange={handleFormChange}
            />
          </label>

          <div className="toolbar right span-2">
            <button type="button" className="btn ghost sm" onClick={resetForm} disabled={saving}>
              Clear
            </button>
            <button
              type="submit"
              className="btn primary sm"
              disabled={saving || categories.length === 0}
            >
              {saving ? 'Saving...' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="budgets-toolbar">
          <div className="filters">
            <label className="set-field">
              <span className="set-label">Filter by month</span>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              >
                <option value="">All months</option>
                {[...new Set([...availableMonths, selectedMonth].filter(Boolean))]
                  .sort()
                  .map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="summary-chips">
            <span className="chip">Planned: {currency.format(summary.totalLimit || 0)}</span>
            <span className="chip warn">Spent: {currency.format(summary.totalSpent || 0)}</span>
            <span className="chip good">Remaining: {currency.format(summary.totalRemaining || 0)}</span>
          </div>
        </div>

        <div className="budget-chart">
          {chartData.length === 0 ? (
            <div className="empty">No budget data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => currency.format(value).replace('₹', '')} />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Legend />
                <Bar dataKey="Limit" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="table-wrap">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Month</th>
                <th>Limit</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Loading budgets…
                  </td>
                </tr>
              ) : enhancedBudgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    No budgets yet.
                  </td>
                </tr>
              ) : (
                enhancedBudgets.map((budget) => {
                  const isEditing = editing?.id === budget._id;
                  return (
                    <tr key={budget._id} className={isEditing ? 'edit-row' : ''}>
                      <td>
                        {isEditing ? (
                          <input
                            list="budgetCategoryOptions"
                            name="category"
                            value={editing.category}
                            onChange={handleEditChange}
                          />
                        ) : (
                          budget.category
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="month"
                            name="month"
                            value={editing.month}
                            onChange={handleEditChange}
                          />
                        ) : (
                          formatMonthLabel(budget.month)
                        )}
                      </td>
                      <td>{currency.format(budget.limit || 0)}</td>
                      <td>{currency.format(budget.spent || 0)}</td>
                      <td>{currency.format(budget.remaining || 0)}</td>
                      <td>
                        <div className="progress-track">
                          <div
                            className={`progress-fill ${budget.status?.toLowerCase()}`}
                            style={{ width: `${budget.progress}%` }}
                          />
                        </div>
                        <span className="progress-label">{budget.progress.toFixed(0)}%</span>
                      </td>
                      <td>
                        <span className={chipClass(budget.status)}>{budget.status}</span>
                      </td>
                      <td className="actions-col">
                        {isEditing ? (
                          <div className="inline-edit-actions">
                            <button type="button" className="btn ghost sm" onClick={cancelEdit} disabled={saving}>
                              Cancel
                            </button>
                            <button type="button" className="btn primary sm" onClick={saveEdit} disabled={saving}>
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button type="button" className="link" onClick={() => startEdit(budget)}>
                              Edit
                            </button>
                            {' | '}
                            <button
                              type="button"
                              className="link danger"
                              onClick={() => handleDelete(budget._id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
