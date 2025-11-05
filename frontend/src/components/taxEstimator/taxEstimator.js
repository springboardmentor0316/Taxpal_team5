import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddReminderModal from '../taxCalender/addReminderModal';
import './taxEstimator.css';
import {
  fetchTaxEstimates,
  saveTaxEstimate,
  deleteTaxEstimate,
} from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import { useModal } from '../modal/ModalProvider';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "India",
  "Japan",
];

// Minimal demo lists per country; extend as needed
const STATES_BY_COUNTRY = {
  "United States": ["California", "New York", "Texas", "Florida"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Alberta"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia"],
  Germany: ["Bavaria", "Berlin", "Hesse", "North Rhine-Westphalia"],
  France: ["Île-de-France", "Provence-Alpes-Côte d’Azur", "Nouvelle-Aquitaine", "Occitanie"],
  India: ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi"],
  Japan: ["Tokyo", "Osaka", "Hokkaido", "Aichi"],
};

const QUARTERS = [
  { id: "Q1", label: "Q1 (Jan–Mar)" },
  { id: "Q2", label: "Q2 (Apr–Jun)" },
  { id: "Q3", label: "Q3 (Jul–Sep)" },
  { id: "Q4", label: "Q4 (Oct–Dec)" },
];

const FILING_STATUS = [
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
];

function estimateQuarterlyTax({
  country,
  state,
  status,
  income,
  expenses,
  insurance,
  retirement,
  homeOffice,
}) {
  const gross = Number(income || 0);
  const ded =
    Number(expenses || 0) +
    Number(insurance || 0) +
    Number(retirement || 0) +
    Number(homeOffice || 0);

  const statusStd =
    {
      Single: 13000,
      "Married Filing Jointly": 26000,
      "Married Filing Separately": 13000,
      "Head of Household": 19000,
    }[status] ?? 13000;

  const rateByCountry = {
    "United States": 0.22,
    India: 0.20,
    "United Kingdom": 0.21,
    Canada: 0.23,
    Australia: 0.22,
    Germany: 0.24,
    France: 0.23,
    Japan: 0.22,
  };
  const baseRate = rateByCountry[country] ?? 0.20;

  let stateAdj = 0;
  if (country === "United States") {
    if (state === "California") stateAdj = 0.02;
    if (state === "New York") stateAdj = 0.015;
  }

  const effectiveRate = Math.max(0, baseRate + stateAdj);

  const quarterlyGross = gross;
  const quarterlyDeductions = Math.max(0, ded);
  const quarterlyTaxable = Math.max(0, quarterlyGross - quarterlyDeductions);
  const annualTaxable = Math.max(0, quarterlyTaxable * 4 - statusStd);
  const annualTax = Math.max(0, annualTaxable * effectiveRate);
  const estimatedQuarterlyTax = Math.round(annualTax / 4);

  return {
    grossQuarter: quarterlyGross,
    deductionsQuarter: quarterlyDeductions,
    taxableQuarter: quarterlyTaxable,
    annualTaxable,
    annualTax,
    estimatedQuarterlyTax,
    effectiveRate,
  };
}

export default function TaxEstimator() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useModal();
  const [openReminder, setOpenReminder] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    country: 'United States',
    state: 'California',
    status: 'Single',
    quarter: 'Q2',
    year: new Date().getFullYear(),
    income: '',
    expenses: '',
    insurance: '',
    retirement: '',
    homeOffice: '',
  });

  const subdivisions = useMemo(() => STATES_BY_COUNTRY[form.country] ?? [], [form.country]);
  const hasSubdivisions = subdivisions.length > 0;

  // Reset state when country changes if current state is invalid
  useEffect(() => {
    setForm((f) => {
      if (!hasSubdivisions) {
        return { ...f, state: "" };
      }
      if (!subdivisions.includes(f.state)) {
        return { ...f, state: subdivisions[0] };
      }
      return f;
    });
  }, [form.country, hasSubdivisions, subdivisions]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'year' ? Number(value) : value }));
  };

  const result = useMemo(() => estimateQuarterlyTax(form), [form]);

  const quarterDueDate = useMemo(() => {
    // simple demo due dates
    const year = Number(form.year) || new Date().getFullYear();
    const map = {
      Q1: `${year}-04-15`,
      Q2: `${year}-06-15`,
      Q3: `${year}-09-15`,
      Q4: `${year + 1}-01-15`,
    };
    return map[form.quarter] || '';
  }, [form.quarter, form.year]);

const seedReminder = useMemo(
  () => ({
    title: `${form.quarter} Estimated Tax Payment`,
    date: quarterDueDate,
    type: 'payment',
  }),
  [form.quarter, quarterDueDate]
);

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(value || 0);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await fetchTaxEstimates();
        setHistory(response.estimates || []);
      } catch (error) {
        const message = error.message || 'Failed to load tax estimates';
        showToast({ message, type: 'error' });
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [showToast]);

  const handleSaveEstimate = async () => {
    try {
      setSaving(true);
      await saveTaxEstimate({
        quarter: form.quarter,
        year: form.year,
        country: form.country,
        state: form.state,
        filingStatus: form.status,
        grossIncome: result.grossQuarter,
        businessExpenses: Number(form.expenses || 0),
        healthInsurancePremiums: Number(form.insurance || 0),
        retirementContribution: Number(form.retirement || 0),
        homeOfficeDeduction: Number(form.homeOffice || 0),
        estimatedTax: result.estimatedQuarterlyTax,
        effectiveRate: result.effectiveRate,
      });
      showToast({ message: 'Tax estimate saved' });
      const response = await fetchTaxEstimates();
      setHistory(response.estimates || []);
    } catch (error) {
      const message = error.message || 'Failed to save tax estimate';
      showToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEstimate = async (id) => {
    const confirmed = await confirm({
      title: 'Delete saved estimate',
      message: 'Removing this estimate will also clear any reminders linked to it.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTaxEstimate(id);
      setHistory((prev) => prev.filter((item) => item._id !== id));
      showToast({ message: 'Tax estimate deleted' });
    } catch (error) {
      const message = error.message || 'Failed to delete tax estimate';
      showToast({ message, type: 'error' });
    }
  };

  return (
    <div className="tax-page">
      <section className="tax-metrics">
        <MetricCard
          title="Quarterly Gross"
          value={formatCurrency(result.grossQuarter)}
          subtitle={`Total income for ${form.quarter}`}
        />
        <MetricCard
          title="Deductions"
          value={formatCurrency(result.deductionsQuarter)}
          subtitle="Expenses & adjustments"
        />
        <MetricCard
          title="Estimated Tax Due"
          value={formatCurrency(result.estimatedQuarterlyTax)}
          subtitle={quarterDueDate ? `Due ${quarterDueDate}` : 'No upcoming taxes'}
        />
        <MetricCard
          title="Effective Rate"
          value={`${(result.effectiveRate * 100).toFixed(1)}%`}
          subtitle="Applied to net taxable income"
        />
      </section>

      <div className="set-head compact between">
        <div className="set-head compact">
          <h2 className="set-title">Tax Estimator</h2>
          <p className="set-sub">Calculate estimated quarterly tax obligations.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outlines" onClick={() => navigate("/tax-calendar")}>
            Tax Calendar
          </button>
          <button className="btn primary" onClick={() => setOpenReminder(true)}>
            Add Reminder
          </button>
        </div>
      </div>

      <div className="tax-layout">
        <div className="panel left">
          <form className="tax-grid" onSubmit={(e) => e.preventDefault()}>
            <label className="set-field">
              <span className="set-label">Country/Region</span>
              <select name="country" value={form.country} onChange={onChange}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="set-field">
              <span className="set-label">State/Province</span>
              <select
                name="state"
                value={form.state}
                onChange={onChange}
                disabled={!hasSubdivisions}
                title={!hasSubdivisions ? "No subdivisions for this country" : undefined}
              >
                {hasSubdivisions ? (
                  subdivisions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                ) : (
                  <option value="">N/A</option>
                )}
              </select>
            </label>

            <label className="set-field">
              <span className="set-label">Filing Status</span>
              <select name="status" value={form.status} onChange={onChange}>
                {FILING_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="set-field">
              <span className="set-label">Quarter</span>
              <select name="quarter" value={form.quarter} onChange={onChange}>
                {QUARTERS.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="set-field">
              <span className="set-label">Year</span>
              <input
                name="year"
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={onChange}
              />
            </label>

            <label className="set-field span-2">
              <span className="set-label">Gross Income for Quarter</span>
              <input
                name="income"
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ 0.00"
                value={form.income}
                onChange={onChange}
              />
            </label>

            <div className="grid-2 span-2">
              <label className="set-field">
                <span className="set-label">Business Expenses</span>
                <input
                  name="expenses"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={form.expenses}
                  onChange={onChange}
                />
              </label>
              <label className="set-field">
                <span className="set-label">Health Insurance Premiums</span>
                <input
                  name="insurance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={form.insurance}
                  onChange={onChange}
                />
              </label>
            </div>

            <div className="grid-2 span-2">
              <label className="set-field">
                <span className="set-label">Retirement Contributions</span>
                <input
                  name="retirement"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={form.retirement}
                  onChange={onChange}
                />
              </label>
              <label className="set-field">
                <span className="set-label">Home Office Deduction</span>
                <input
                  name="homeOffice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0.00"
                  value={form.homeOffice}
                  onChange={onChange}
                />
              </label>
            </div>

            <div className="toolbar">
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveEstimate}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Estimate'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel right">
          <div className="tax-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { label: 'Gross Income', amount: result.grossQuarter },
                  { label: 'Deductions', amount: result.deductionsQuarter },
                  { label: 'Estimated Tax', amount: result.estimatedQuarterlyTax },
                  {
                    label: 'Net After Tax',
                    amount: Math.max(result.grossQuarter - result.estimatedQuarterlyTax, 0),
                  },
                ]}
                margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => formatCurrency(value).replace('₹', '')} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h4 className="set-title sm">Tax Summary</h4>
          <div className="summary">
            <div className="row">
              <span>Quarterly Gross</span>
              <span>{formatCurrency(result.grossQuarter)}</span>
            </div>
            <div className="row">
              <span>Quarterly Deductions</span>
              <span>{formatCurrency(result.deductionsQuarter)}</span>
            </div>
            <div className="row">
              <span>Quarterly Taxable</span>
              <span>{formatCurrency(result.taxableQuarter)}</span>
            </div>
            <div className="row">
              <span>Annual Taxable (est.)</span>
              <span>{formatCurrency(result.annualTaxable)}</span>
            </div>
            <div className="row">
              <span>Effective Rate</span>
              <span>{(result.effectiveRate * 100).toFixed(1)}%</span>
            </div>
            <hr />
            <div className="row total">
              <span>Estimated Quarterly Tax</span>
              <span>{formatCurrency(result.estimatedQuarterlyTax)}</span>
            </div>
          </div>

          <div className="history">
            <h4 className="set-title sm">Saved Estimates</h4>
            {loadingHistory ? (
              <div className="placeholder">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="placeholder">No saved estimates yet.</div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Quarter</th>
                    <th>Year</th>
                    <th>Estimated Tax</th>
                    <th>Effective Rate</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id}>
                      <td>{item.quarter}</td>
                      <td>{item.year}</td>
                      <td>₹{Number(item.estimatedTax || 0).toLocaleString()}</td>
                      <td>{((item.effectiveRate || 0) * 100).toFixed(1)}%</td>
                      <td>
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link danger"
                          onClick={() => handleDeleteEstimate(item._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AddReminderModal
        open={openReminder}
        onClose={() => setOpenReminder(false)}
        seed={seedReminder}
      />
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div className="tax-metric-card">
      <h4 className="metric-title">{title}</h4>
      <div className="metric-value">{value}</div>
      <p className="metric-subtitle">{subtitle}</p>
    </div>
  );
}
