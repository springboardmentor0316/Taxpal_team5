const Transaction = require('../models/Transaction');

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const clampToStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const clampToEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const formatRangeLabel = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return 'All Time';
  }

  if (startDate && endDate) {
    return `${dayFormatter.format(startDate)} – ${dayFormatter.format(endDate)}`;
  }

  if (startDate) {
    return `From ${dayFormatter.format(startDate)}`;
  }

  return `Through ${dayFormatter.format(endDate)}`;
};

const resolveQuarterRange = (quarter, referenceDate) => {
  const year = referenceDate.getFullYear();
  const startMonth = (quarter - 1) * 3;
  const start = clampToStartOfDay(new Date(year, startMonth, 1));
  const end = clampToEndOfDay(new Date(year, startMonth + 3, 0));
  return { start, end, label: `Q${quarter} ${year}` };
};

const resolvePeriodRange = (periodKey = 'current-month', customRange = {}, referenceDate = new Date()) => {
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  now.setHours(12, 0, 0, 0);

  const year = now.getFullYear();
  const month = now.getMonth();

  switch (periodKey) {
    case 'current-month': {
      const start = clampToStartOfDay(new Date(year, month, 1));
      const end = clampToEndOfDay(new Date(year, month + 1, 0));
      return { start, end, label: monthFormatter.format(start) };
    }
    case 'last-month': {
      const start = clampToStartOfDay(new Date(year, month - 1, 1));
      const end = clampToEndOfDay(new Date(year, month, 0));
      return { start, end, label: monthFormatter.format(start) };
    }
    case 'q1':
      return resolveQuarterRange(1, now);
    case 'q2':
      return resolveQuarterRange(2, now);
    case 'q3':
      return resolveQuarterRange(3, now);
    case 'q4':
      return resolveQuarterRange(4, now);
    case 'ytd': {
      const start = clampToStartOfDay(new Date(year, 0, 1));
      const end = clampToEndOfDay(now);
      return { start, end, label: `Year to Date ${year}` };
    }
    case 'last-year': {
      const start = clampToStartOfDay(new Date(year - 1, 0, 1));
      const end = clampToEndOfDay(new Date(year - 1, 11, 31));
      return { start, end, label: `${year - 1}` };
    }
    case 'custom': {
      const startInput = parseDateInput(customRange?.startDate);
      const endInput = parseDateInput(customRange?.endDate);
      if (!startInput || !endInput) {
        throw new Error('Custom period requires valid start and end dates');
      }
      const start = clampToStartOfDay(startInput);
      const end = clampToEndOfDay(endInput);
      if (start > end) {
        throw new Error('Custom period start date must be before end date');
      }
      return {
        start,
        end,
        label: customRange?.label || formatRangeLabel(start, end),
      };
    }
    case 'rolling-90': {
      const start = clampToStartOfDay(new Date(now));
      start.setDate(start.getDate() - 89);
      const end = clampToEndOfDay(now);
      return { start, end, label: 'Last 90 Days' };
    }
    default: {
      const fallback = parseDateInput(customRange?.startDate);
      const fallbackEnd = parseDateInput(customRange?.endDate);
      if (fallback && fallbackEnd) {
        const start = clampToStartOfDay(fallback);
        const end = clampToEndOfDay(fallbackEnd);
        if (start > end) {
          throw new Error('Invalid period range');
        }
        return { start, end, label: formatRangeLabel(start, end) };
      }

      // Default to current month if we cannot resolve the period
      const start = clampToStartOfDay(new Date(year, month, 1));
      const end = clampToEndOfDay(new Date(year, month + 1, 0));
      return { start, end, label: monthFormatter.format(start) };
    }
  }
};

const derivePreviousRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }
  const duration = endDate.getTime() - startDate.getTime();
  const previousEnd = clampToEndOfDay(new Date(startDate.getTime() - 1));
  const previousStart = clampToStartOfDay(new Date(previousEnd.getTime() - duration));
  return {
    start: previousStart,
    end: previousEnd,
    label: formatRangeLabel(previousStart, previousEnd),
  };
};

const fetchTransactions = async (userId, startDate, endDate) => {
  const query = { user: userId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = startDate;
    }
    if (endDate) {
      query.date.$lte = endDate;
    }
  }

  return Transaction.find(query).sort({ date: 1 }).lean();
};

const amountReducer = (acc, txn) => acc + (txn?.amount || 0);

const aggregateByCategory = (transactions) => {
  const map = new Map();
  transactions.forEach((txn) => {
    const label = txn.category || 'Uncategorized';
    map.set(label, (map.get(label) || 0) + (txn.amount || 0));
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
};

const aggregateByMonth = (transactions) => {
  const map = new Map();
  transactions.forEach((txn) => {
    const date = txn?.date ? new Date(txn.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      const label = monthFormatter.format(date);
      map.set(key, { key, label, income: 0, expense: 0 });
    }
    const bucket = map.get(key);
    if (txn.type === 'income') {
      bucket.income += txn.amount || 0;
    } else if (txn.type === 'expense') {
      bucket.expense += txn.amount || 0;
    }
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
};

const aggregateTopTransactions = (transactions, limit = 5, type = 'expense') => {
  return transactions
    .filter((txn) => txn.type === type)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, limit)
    .map((txn) => ({
      label: txn.description || txn.category || 'Untitled',
      category: txn.category || 'Uncategorized',
      date: txn.date ? dayFormatter.format(new Date(txn.date)) : null,
      value: txn.amount || 0,
    }));
};

const buildIncomeStatement = ({ transactions, previousTransactions, periodLabel, generatedAt, startDate, endDate }) => {
  const incomeTransactions = transactions.filter((txn) => txn.type === 'income');
  const expenseTransactions = transactions.filter((txn) => txn.type === 'expense');

  const totalIncome = incomeTransactions.reduce(amountReducer, 0);
  const totalExpense = expenseTransactions.reduce(amountReducer, 0);
  const netIncome = totalIncome - totalExpense;

  const previousIncome = (previousTransactions || []).filter((txn) => txn.type === 'income').reduce(amountReducer, 0);
  const previousExpense = (previousTransactions || []).filter((txn) => txn.type === 'expense').reduce(amountReducer, 0);
  const previousNet = previousIncome - previousExpense;

  const computeDelta = (current, previous) => {
    if (!previous) {
      return null;
    }
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return ((current - previous) / previous) * 100;
  };

  return {
    title: 'Income Statement',
    subtitle: periodLabel,
    generatedAt,
    startDate,
    endDate,
    sections: [
      {
        type: 'metrics',
        title: 'Key Metrics',
        items: [
          { label: 'Total Income', value: totalIncome, delta: computeDelta(totalIncome, previousIncome) },
          { label: 'Total Expenses', value: totalExpense, delta: computeDelta(totalExpense, previousExpense), kind: 'negative' },
          { label: 'Net Income', value: netIncome, delta: computeDelta(netIncome, previousNet) },
          {
            label: 'Profit Margin',
            value: totalIncome ? (netIncome / totalIncome) * 100 : 0,
            format: 'percentage',
          },
          {
            label: 'Expense Ratio',
            value: totalIncome ? (totalExpense / totalIncome) * 100 : 0,
            format: 'percentage',
            kind: 'negative',
          },
        ],
      },
      {
        type: 'table',
        title: 'Income by Category',
        headers: ['Category', 'Amount'],
        rows: aggregateByCategory(incomeTransactions).map(({ label, value }) => ({ cells: [label, value] })),
        footer: { label: 'Total Income', value: totalIncome },
        emptyMessage: 'No income recorded for the selected period.',
      },
      {
        type: 'table',
        title: 'Expenses by Category',
        headers: ['Category', 'Amount'],
        rows: aggregateByCategory(expenseTransactions).map(({ label, value }) => ({ cells: [label, value] })),
        footer: { label: 'Total Expenses', value: totalExpense },
        emptyMessage: 'No expenses recorded for the selected period.',
      },
    ],
    summary: {
      totalIncome,
      totalExpense,
      netIncome,
    },
  };
};

const buildExpenseSummary = ({ transactions, periodLabel, generatedAt, startDate, endDate }) => {
  const expenseTransactions = transactions.filter((txn) => txn.type === 'expense');
  const totalExpense = expenseTransactions.reduce(amountReducer, 0);
  const byCategory = aggregateByCategory(expenseTransactions);
  const topExpenses = aggregateTopTransactions(expenseTransactions, 5, 'expense');

  return {
    title: 'Expense Summary',
    subtitle: periodLabel,
    generatedAt,
    startDate,
    endDate,
    sections: [
      {
        type: 'metrics',
        title: 'Overview',
        items: [
          { label: 'Total Expenses', value: totalExpense, kind: 'negative' },
          {
            label: 'Average Daily Spend',
            value: (() => {
              if (!expenseTransactions.length) {
                return 0;
              }
              const uniqueDays = new Set(
                expenseTransactions.map((txn) => new Date(txn.date).toISOString().slice(0, 10))
              );
              return totalExpense / Math.max(uniqueDays.size, 1);
            })(),
          },
          {
            label: 'Largest Category Share',
            value: byCategory.length ? (byCategory[0].value / Math.max(totalExpense, 1)) * 100 : 0,
            format: 'percentage',
            kind: byCategory.length ? (byCategory[0].value / Math.max(totalExpense, 1)) * 100 > 50 ? 'warning' : 'default' : 'default',
          },
        ],
      },
      {
        type: 'table',
        title: 'Spend by Category',
        headers: ['Category', 'Amount', 'Share'],
        rows: byCategory.map(({ label, value }) => ({
          cells: [label, value, totalExpense ? (value / totalExpense) * 100 : 0],
          formats: [null, null, 'percentage'],
        })),
        footer: { label: 'Total Spend', value: totalExpense },
        emptyMessage: 'No expenses recorded for the selected period.',
      },
      {
        type: 'table',
        title: 'Top Expenses',
        headers: ['Description', 'Category', 'Date', 'Amount'],
        rows: topExpenses.map((entry) => ({
          cells: [entry.label, entry.category, entry.date, entry.value],
        })),
        emptyMessage: 'No high-value expenses recorded.',
      },
    ],
    summary: {
      totalExpense,
      topCategories: byCategory.slice(0, 3),
    },
  };
};

const buildCashFlowReport = ({ transactions, periodLabel, generatedAt, startDate, endDate }) => {
  const timeline = aggregateByMonth(transactions);
  const totals = timeline.reduce(
    (acc, bucket) => {
      acc.income += bucket.income;
      acc.expense += bucket.expense;
      acc.net += bucket.income - bucket.expense;
      return acc;
    },
    { income: 0, expense: 0, net: 0 }
  );

  return {
    title: 'Cash Flow Statement',
    subtitle: periodLabel,
    generatedAt,
    startDate,
    endDate,
    sections: [
      {
        type: 'metrics',
        title: 'Summary',
        items: [
          { label: 'Cash Inflows', value: totals.income },
          { label: 'Cash Outflows', value: totals.expense, kind: 'negative' },
          { label: 'Net Cash', value: totals.net },
          {
            label: 'Average Monthly Net',
            value: timeline.length ? totals.net / timeline.length : 0,
          },
        ],
      },
      {
        type: 'table',
        title: 'Monthly Cash Flow',
        headers: ['Month', 'Inflows', 'Outflows', 'Net'],
        rows: timeline.map((bucket) => ({
          cells: [
            bucket.label,
            bucket.income,
            bucket.expense,
            bucket.income - bucket.expense,
          ],
        })),
        footer: { label: 'Totals', value: totals.net },
        emptyMessage: 'No transactions available to build a cash flow timeline.',
      },
    ],
    summary: totals,
  };
};

const buildBalanceSheet = ({ cumulativeTransactions, periodLabel, generatedAt, startDate, endDate }) => {
  const incomeTransactions = cumulativeTransactions.filter((txn) => txn.type === 'income');
  const expenseTransactions = cumulativeTransactions.filter((txn) => txn.type === 'expense');

  const totalIncome = incomeTransactions.reduce(amountReducer, 0);
  const totalExpense = expenseTransactions.reduce(amountReducer, 0);
  const equity = totalIncome - totalExpense;

  const assets = aggregateByCategory(incomeTransactions);
  const liabilities = aggregateByCategory(expenseTransactions);

  return {
    title: 'Balance Sheet',
    subtitle: periodLabel,
    generatedAt,
    startDate,
    endDate,
    sections: [
      {
        type: 'metrics',
        title: 'Snapshot',
        items: [
          { label: 'Total Assets', value: totalIncome },
          { label: 'Total Liabilities', value: totalExpense, kind: 'negative' },
          { label: "Owner's Equity", value: equity },
          {
            label: 'Debt-to-Income Ratio',
            value: totalIncome ? (totalExpense / totalIncome) * 100 : 0,
            format: 'percentage',
            kind: 'negative',
          },
        ],
      },
      {
        type: 'table',
        title: 'Assets',
        headers: ['Category', 'Amount'],
        rows: assets.map(({ label, value }) => ({ cells: [label, value] })),
        footer: { label: 'Total Assets', value: totalIncome },
        emptyMessage: 'No asset data available.',
      },
      {
        type: 'table',
        title: 'Liabilities',
        headers: ['Category', 'Amount'],
        rows: liabilities.map(({ label, value }) => ({ cells: [label, value] })),
        footer: { label: 'Total Liabilities', value: totalExpense },
        emptyMessage: 'No liability data available.',
      },
    ],
    summary: {
      totalAssets: totalIncome,
      totalLiabilities: totalExpense,
      equity,
    },
  };
};

const buildReportPayload = async ({
  reportType,
  userId,
  startDate,
  endDate,
  periodLabel,
  referenceDate = new Date(),
}) => {
  const generatedAt = referenceDate.toISOString();

  const transactions = await fetchTransactions(userId, startDate, endDate);
  const previousRange = derivePreviousRange(startDate, endDate);
  const previousTransactions = previousRange
    ? await fetchTransactions(userId, previousRange.start, previousRange.end)
    : [];

  switch (reportType) {
    case 'Income Statement':
      return buildIncomeStatement({
        transactions,
        previousTransactions,
        periodLabel,
        generatedAt,
        startDate,
        endDate,
      });
    case 'Expense Summary':
      return buildExpenseSummary({
        transactions,
        periodLabel,
        generatedAt,
        startDate,
        endDate,
      });
    case 'Cash Flow':
      return buildCashFlowReport({
        transactions,
        periodLabel,
        generatedAt,
        startDate,
        endDate,
      });
    case 'Balance Sheet': {
      const cumulativeTransactions = await fetchTransactions(userId, null, endDate);
      return buildBalanceSheet({
        cumulativeTransactions,
        periodLabel,
        generatedAt,
        startDate,
        endDate,
      });
    }
    default:
      return {
        title: reportType || 'Financial Report',
        subtitle: periodLabel,
        generatedAt,
        startDate,
        endDate,
        sections: [
          {
            type: 'text',
            body: 'No generator is configured for this report yet.',
          },
        ],
      };
  }
};

module.exports = {
  resolvePeriodRange,
  formatRangeLabel,
  buildReportPayload,
};
