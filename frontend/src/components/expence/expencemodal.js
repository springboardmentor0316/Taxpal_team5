import React, { useState, useEffect } from 'react';
import { createTransaction, updateTransaction } from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import './expencemodal.css';

// helpers
const isoToday = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const expenseCategories = ['Utilities', 'Food', 'Transport', 'Rent', 'Software', 'Other'];

const initialState = { description: '', amount: '', category: '', date: '', notes: '' };

export default function ExpenseModal({ open, onClose, onSubmit, transaction }) {
  const isEdit = Boolean(transaction?.type === 'expense' && transaction?._id);
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({ amount: '', description: '', category: '', date: '' });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // set default date on open; reset on close
  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setErrors({ amount: '', description: '', category: '', date: '' });
      return;
    }

    if (isEdit && transaction) {
      setForm({
        description: transaction.description || '',
        amount: transaction.amount != null ? String(transaction.amount) : '',
        category: transaction.category || '',
        date: transaction.date ? transaction.date.slice(0, 10) : isoToday(),
        notes: transaction.notes || '',
      });
    } else {
      setForm({ ...initialState, date: isoToday() });
    }
  }, [open, isEdit, transaction]);

  if (!open) return null;

  const handle = (e) => {
    const { name, value } = e.target;

    if (name === 'amount') {
      if (value === '') {
        setForm((f) => ({ ...f, amount: '' }));
        setErrors((er) => ({ ...er, amount: '' }));
        return;
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        setErrors((er) => ({ ...er, amount: 'Enter a valid number' }));
        return;
      }
      if (num < 0) {
        setErrors((er) => ({ ...er, amount: 'Amount cannot be negative' }));
        setForm((f) => ({ ...f, amount: '0' }));
        return;
      }
      setErrors((er) => ({ ...er, amount: '' }));
      setForm((f) => ({ ...f, amount: String(Math.max(0, num)) }));
      return;
    }

    if (name === 'date') {
      const today = isoToday();
      const next = value && value > today ? today : value; // allow any past date
      setForm((f) => ({ ...f, date: next }));
      setErrors((er) => ({ ...er, date: '' }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const er = {};
    if (!form.description.trim()) er.description = 'Description is required';
    const amt = Number(form.amount);
    if (form.amount === '' || Number.isNaN(amt)) er.amount = 'Amount is required';
    else if (amt < 0) er.amount = 'Amount cannot be negative';
    if (!form.category) er.category = 'Select a category';
    if (!form.date) er.date = 'Select a date';
    else if (form.date > isoToday()) er.date = 'Future date not allowed';
    setErrors((prev) => ({ ...prev, ...er }));
    return Object.keys(er).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const payload = { ...form, type: 'expense', amount: Number(form.amount) };

    try {
      setSaving(true);
      if (isEdit && transaction?._id) {
        await updateTransaction(transaction._id, payload);
        showToast({ message: 'Expense updated successfully' });
      } else {
        await createTransaction(payload);
        showToast({ message: 'Expense recorded successfully' });
      }
      onSubmit && onSubmit();
      onClose();
    } catch (error) {
      const message = error.message || (isEdit ? 'Failed to update expense' : 'Failed to record expense');
      showToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expense-modal modal-backdrop" role="dialog" aria-modal="true" aria-label="Record New Expense">
      <div className="modal-sheet">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Expense' : 'Record New Expense'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <label>Description</label>
              <input
                name="description"
                placeholder="e.g. Web Design Project"
                value={form.description}
                onChange={handle}
              />
              {errors.description && <small className="field-error">{errors.description}</small>}
            </div>

            <div className="form-row">
              <label>Amount</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={handle}
              />
              {errors.amount && <small className="field-error">{errors.amount}</small>}
            </div>

            <div className="form-row">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handle}>
                <option value="" disabled>Select a category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <small className="field-error">{errors.category}</small>}
            </div>

            <div className="form-row">
              <label>Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handle}
                max={isoToday()}  // block future dates
              />
              {errors.date && <small className="field-error">{errors.date}</small>}
            </div>

            <div className="form-row full">
              <label>Notes (Optional)</label>
              <textarea
                name="notes"
                rows="4"
                placeholder="Add any additional details..."
                value={form.notes}
                onChange={handle}
              />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} type="button" disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} type="button" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
