import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import IncomeModal from '../income/incomemodal';
import ExpenseModal from '../expence/expencemodal';
import { fetchTransactionSummary } from '../../services/api';
import { useToast } from '../toast/ToastProvider';
import { getStoredUser, onStoredUserChange } from '../../utils/user';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonthLabel = (iso) => {
  if (!iso) return '—';
  const [year, month] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'short' });
};

const pieColors = ['#6366f1', '#22d3ee', '#f97316', '#10b981', '#facc15', '#a855f7', '#ef4444', '#14b8a6'];

const RANGE_LABEL = {
  year: 'Month',
  quarter: 'Quarter',
  month: 'Day',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [dailySeries, setDailySeries] = useState([]);
  const [quarterSeries, setQuarterSeries] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [chartRange, setChartRange] = useState('year');

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTransactionSummary();
      setMetrics(data.metrics || null);
      setRecent(data.recentTransactions || []);
      setMonthlySeries(data.monthlySeries || []);
      setDailySeries(data.dailySeries || []);
      setQuarterSeries(data.quarterSeries || []);
      setCategoryBreakdown(data.categoryBreakdown || []);
    } catch (error) {
      const message = error.message || 'Failed to load dashboard data';
      showToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    const unsubscribe = onStoredUserChange(() => setCurrentUser(getStoredUser()));
    return unsubscribe;
  }, []);

  const displayUsername = currentUser?.username || null;
  const friendlyName = currentUser?.fullName || currentUser?.username || 'there';
  const displayEmail = currentUser?.email || null;

  const handleRecord = () => {
    loadSummary();
  };

  const coerceNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const yearData = useMemo(() => {
    const byMonth = new Map();
    monthlySeries.forEach((entry) => {
      if (!byMonth.has(entry.month)) {
        byMonth.set(entry.month, {
          label: formatMonthLabel(entry.month),
          income: 0,
          expense: 0,
        });
      }
      const record = byMonth.get(entry.month);
      const total = coerceNumber(entry.total);
      if (entry.type === 'income') {
        record.income = total;
      } else {
        record.expense = total;
      }
      byMonth.set(entry.month, record);
    });
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [monthlySeries]);

  const quarterData = useMemo(
    () =>
      quarterSeries.map((entry) => ({
        label: entry.period,
        income: coerceNumber(entry.income),
        expense: coerceNumber(entry.expense),
      })),
    [quarterSeries]
  );

  const monthData = useMemo(() => {
    const byDay = new Map();
    dailySeries.forEach((entry) => {
      const dayKey = entry.day;
      if (!byDay.has(dayKey)) {
        const formatted = new Date(dayKey).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        });
        byDay.set(dayKey, { label: formatted, income: 0, expense: 0 });
      }
      const record = byDay.get(dayKey);
      const total = coerceNumber(entry.total);
      if (entry.type === 'income') {
        record.income = total;
      } else {
        record.expense = total;
      }
      byDay.set(dayKey, record);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [dailySeries]);

  const chartData = useMemo(() => {
    if (chartRange === 'quarter') return quarterData;
    if (chartRange === 'month') return monthData;
    return yearData;
  }, [chartRange, quarterData, monthData, yearData]);

  const pieData = useMemo(
    () =>
      categoryBreakdown.map((item) => ({
        name: item.category,
        value: coerceNumber(item.total),
      })),
    [categoryBreakdown]
  );

  const isLoading = loading && !metrics;

  return (
    <>
      <header className="dash-header set-head between">
        <div className="set-head compact">
          <h1 className="set-title lg">Financial Dashboard</h1>
          <p className="set-sub">
            Welcome back, {friendlyName}! Here's your financial summary.
            {(displayUsername || displayEmail) && (
              <span className="dash-email">
                {displayUsername ? `Username: ${displayUsername}` : ''}
                {displayUsername && displayEmail ? ' • ' : ''}
                {displayEmail ? `Email: ${displayEmail}` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-record income" onClick={() => setShowIncome(true)}>
            <span className="btn-icon">➕</span>
            Record Income
          </button>
          <button className="btn-record expense" onClick={() => setShowExpense(true)}>
            <span className="btn-icon">➖</span>
            Record Expense
          </button>
        </div>
      </header>

      <section className="metric-grid">
        {isLoading ? (
          [...Array(4)].map((_, idx) => (
            <div className="metric-card loading" key={idx}>
              <div className="metric-header">
                <span className="metric-title">Loading…</span>
              </div>
              <div className="metric-value skeleton" />
              <div className="metric-change skeleton" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              title="Monthly Income"
              value={currency.format(metrics?.monthlyIncome || 0)}
              change={metrics?.incomeChange}
              changeLabel="from last month"
              icon="arrow-up"
            />
            <MetricCard
              title="Monthly Expense"
              value={currency.format(metrics?.monthlyExpense || 0)}
              change={metrics?.expenseChange}
              changeLabel="from last month"
              icon="arrow-down"
            />
            <MetricCard
              title="Estimated Tax Due"
              value={currency.format(metrics?.estimatedTaxDue || 0)}
              subtitle={metrics?.estimatedTaxDueDate
                ? `Due ${formatDate(metrics.estimatedTaxDueDate)}`
                : 'No upcoming taxes'}
              icon="info"
            />
            <MetricCard
              title="Savings Rate"
              value={`${(metrics?.savingsRate || 0).toFixed(1)}%`}
              change={metrics?.savingsRateChange}
              changeLabel="vs last month"
              icon="target"
            />
          </>
        )}
      </section>

      <section className="charts-grid">
        <div className="chart-card bar">
          <div className="chart-header">
            <h3>Income vs Expense Overview</h3>
            <div className="toggle-group">
              {['year', 'quarter', 'month'].map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`toggle-btn ${chartRange === range ? 'active' : ''}`}
                  onClick={() => setChartRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-body">
            {chartData.length === 0 ? (
              <div className="placeholder-content">
                <span className="placeholder-icon"></span>
                <p>No data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 16, right: 24, left: 32, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    label={{ value: RANGE_LABEL[chartRange], position: 'insideBottom', dy: 12 }}
                    tick={{ fill: '#475569' }}
                  />
                  <YAxis
                    tickFormatter={(value) => currency.format(value).replace(/₹\s?/, '')}
                    tick={{ fill: '#475569' }}
                    width={72}
                  />
                  <Tooltip formatter={(value) => currency.format(value)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card pie">
          <div className="chart-header">
            <h3>Expense Breakdown</h3>
          </div>
          <div className="chart-body">
            {pieData.length === 0 ? (
              <div className="placeholder-content">
                <span className="placeholder-icon"></span>
                <p>No expenses recorded yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency.format(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="transactions-section">
        <div className="section-card">
          <div className="section-header">
            <h3>Recent Transactions</h3>
            <button className="view-all-btn" onClick={() => navigate('/transactions')}>
              View All →
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="transactions-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon"></span>
                <p>No transactions yet</p>
              </div>
            </div>
          ) : (
            <div className="table-wrap compact">
              <table className="tx-table mini">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.date)}</td>
                      <td className="title">{t.description}</td>
                      <td className="cat">{t.category || '—'}</td>
                      <td className={`amount ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}
                        {currency.format(Number(t.amount || 0))}
                      </td>
                      <td className={`type ${t.type}`}>{t.type === 'income' ? 'Income' : 'Expense'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <IncomeModal
        open={showIncome}
        onClose={() => setShowIncome(false)}
        onSubmit={handleRecord}
      />
      <ExpenseModal
        open={showExpense}
        onClose={() => setShowExpense(false)}
        onSubmit={handleRecord}
      />
    </>
  );
}

function MetricCard({ title, value, change, changeLabel, subtitle, icon }) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const positive = hasChange ? change >= 0 : false;
  const changeText = hasChange ? `${positive ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%` : '—';

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {icon === 'info' && <span className="metric-icon">ℹ️</span>}
        {icon === 'target' && <span className="metric-icon">🎯</span>}
        {icon === 'arrow-up' && <span className="metric-icon">⬆️</span>}
        {icon === 'arrow-down' && <span className="metric-icon">⬇️</span>}
      </div>
      <div className="metric-value">{value}</div>
      {subtitle ? (
        <div className="metric-sub">{subtitle}</div>
      ) : (
        <div className={`metric-change ${hasChange ? (positive ? 'positive' : 'negative') : ''}`}>
          {changeText} {hasChange && changeLabel ? changeLabel : !hasChange && changeLabel ? changeLabel : ''}
        </div>
      )}
    </div>
  );
}
