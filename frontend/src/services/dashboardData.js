const baseDataset = {
  metrics: {
    monthlyIncome: 8200,
    incomeChange: 12,
    monthlyExpenses: 4200,
    expensesChange: -8,
    estimatedTaxDue: 950,
    savingsRate: 48,
    savingsGoalChange: 3.2,
  },
  incomeVsExpenses: {
    year: [
      { name: 'Jan', income: 8200, expenses: 3900 },
      { name: 'Feb', income: 7600, expenses: 4100 },
      { name: 'Mar', income: 8400, expenses: 4300 },
      { name: 'Apr', income: 8100, expenses: 4000 },
      { name: 'May', income: 8900, expenses: 4500 },
      { name: 'Jun', income: 8700, expenses: 4200 },
    ],
    quarter: [
      { name: 'Q1', income: 24200, expenses: 12300 },
      { name: 'Q2', income: 25700, expenses: 12700 },
      { name: 'Q3', income: 26500, expenses: 13000 },
      { name: 'Q4', income: 27100, expenses: 12900 },
    ],
    month: [
      { name: 'Week 1', income: 2200, expenses: 900 },
      { name: 'Week 2', income: 2100, expenses: 1050 },
      { name: 'Week 3', income: 1950, expenses: 980 },
      { name: 'Week 4', income: 1930, expenses: 980 },
    ],
  },
  expenseBreakdown: [
    { name: 'Rent & Mortgage', value: 32, color: '#6366f1' },
    { name: 'Business Expenses', value: 26, color: '#22d3ee' },
    { name: 'Utilities', value: 15, color: '#f97316' },
    { name: 'Food', value: 12, color: '#10b981' },
    { name: 'Insurance', value: 8, color: '#facc15' },
    { name: 'Other', value: 7, color: '#a855f7' },
  ],
  transactions: [
    {
      id: 'txn-1',
      date: '2025-05-08',
      description: 'Design Project',
      category: 'Consulting',
      amount: 1290,
      type: 'income',
    },
    {
      id: 'txn-2',
      date: '2025-05-06',
      description: 'Software Subscriptions',
      category: 'Business',
      amount: 320,
      type: 'expense',
    },
    {
      id: 'txn-3',
      date: '2025-05-04',
      description: 'Client Dinner',
      category: 'Meals & Entertainment',
      amount: 180,
      type: 'expense',
    },
    {
      id: 'txn-4',
      date: '2025-05-01',
      description: 'Quarterly Tax Payment',
      category: 'Taxes',
      amount: 750,
      type: 'expense',
    },
    {
      id: 'txn-5',
      date: '2025-04-28',
      description: 'Retainer Work',
      category: 'Consulting',
      amount: 940,
      type: 'income',
    },
  ],
};

const userOverrides = {
  'alex@example.com': {
    displayName: 'Alex Morgan',
    avatar: 'AM',
  },
  'jamie@example.com': {
    metrics: {
      monthlyIncome: 10400,
      incomeChange: 6,
      monthlyExpenses: 5200,
      expensesChange: 4,
      estimatedTaxDue: 1340,
      savingsRate: 38,
      savingsGoalChange: -1.8,
    },
    displayName: 'Jamie Rivera',
    avatar: 'JR',
    incomeVsExpenses: {
      year: [
        { name: 'Jan', income: 10200, expenses: 5100 },
        { name: 'Feb', income: 9800, expenses: 4800 },
        { name: 'Mar', income: 11100, expenses: 5500 },
        { name: 'Apr', income: 10600, expenses: 5300 },
        { name: 'May', income: 10900, expenses: 5400 },
        { name: 'Jun', income: 10850, expenses: 5250 },
      ],
    },
  },
};

const deepMerge = (target, override) => {
  if (!override) return target;

  return Object.entries(override).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = deepMerge({ ...(acc[key] || {}) }, value);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, { ...target });
};

export const fetchDashboardData = (email) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const override = email ? userOverrides[email.toLowerCase()] : null;
      const dataset = deepMerge(baseDataset, override);
      resolve({
        ...dataset,
        user: {
          email,
          displayName: override?.displayName || 'Valued Customer',
          avatar: override?.avatar || (email ? email[0]?.toUpperCase() : 'U'),
        },
      });
    }, 450);
  });

export default fetchDashboardData;
