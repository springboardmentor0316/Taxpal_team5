const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const TaxEstimate = require('../models/TaxEstimate');

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  return { page, pageSize };
};

const buildFilters = (req, userId) => {
  const filters = { user: userId };

  if (req.query.type && ['income', 'expense'].includes(req.query.type)) {
    filters.type = req.query.type;
  }

  if (req.query.category) {
    filters.category = req.query.category;
  }

  if (req.query.startDate || req.query.endDate) {
    filters.date = {};
    if (req.query.startDate) {
      filters.date.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.date.$lte = new Date(req.query.endDate);
    }
  }

  if (req.query.search) {
    const regex = new RegExp(req.query.search.trim(), 'i');
    filters.$or = [
      { description: regex },
      { notes: regex },
    ];
  }

  return filters;
};

exports.createTransaction = async (req, res) => {
  try {
    const { type, category, amount, date, description, notes } = req.body;

    const parsedDate = date ? new Date(date) : new Date();
    const normalizedDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      category,
      amount,
      date: normalizedDate,
      description,
      notes,
    });

    return res.status(201).json({
      message: 'Transaction created successfully',
      transaction,
    });
  } catch (error) {
    console.error('Failed to create transaction', error);
    return res.status(500).json({ message: 'Failed to create transaction' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page, pageSize } = parsePagination(req);
    const filters = buildFilters(req, req.user.id);

    const sortField = ['date', 'amount', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'date';
    const sortOrder = req.query.sortDir === 'asc' ? 1 : -1;

    const totalItems = await Transaction.countDocuments(filters);

    const transactions = await Transaction.find(filters)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return res.json({
      data: transactions,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error('Failed to fetch transactions', error);
    return res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user.id }).lean();

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json(transaction);
  } catch (error) {
    console.error('Failed to fetch transaction', error);
    return res.status(500).json({ message: 'Failed to fetch transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }

    const allowedFields = ['type', 'category', 'amount', 'date', 'description', 'notes'];
    const update = {};

    allowedFields.forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        if (field === 'date') {
          const parsed = req.body[field] ? new Date(req.body[field]) : null;
          if (parsed && !Number.isNaN(parsed.getTime())) {
            update[field] = parsed;
          }
        } else {
          update[field] = req.body[field];
        }
      }
    });

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, user: req.user.id },
      update,
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json({ message: 'Transaction updated successfully', transaction });
  } catch (error) {
    console.error('Failed to update transaction', error);
    return res.status(500).json({ message: 'Failed to update transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id' });
    }

    const transaction = await Transaction.findOneAndDelete({ _id: id, user: req.user.id });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Failed to delete transaction', error);
    return res.status(500).json({ message: 'Failed to delete transaction' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const realNow = new Date();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const latestTransactionDoc = await Transaction.findOne({ user: userObjectId })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const referenceDate = latestTransactionDoc?.date ? new Date(latestTransactionDoc.date) : realNow;

    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const startOfYear = new Date(referenceDate.getFullYear(), 0, 1);
    const previousMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0, 23, 59, 59, 999);

    const [
      totals,
      monthlyAggregate,
      categoryTotals,
      currentMonthAggregate,
      previousMonthAggregate,
      dailyAggregate,
      upcomingEstimate,
      recentTransactions,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $addFields: {
            normalizedDate: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'date'] },
                      ],
                    },
                    then: '$date',
                  },
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'string'] },
                      ],
                    },
                    then: {
                      $dateFromString: {
                        dateString: '$date',
                        onError: referenceDate,
                        onNull: referenceDate,
                      },
                    },
                  },
                ],
                default: referenceDate,
              },
            },
          },
        },
        { $match: { normalizedDate: { $gte: startOfYear, $lte: referenceDate } } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: '%Y-%m', date: '$normalizedDate' } },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]),
      Transaction.aggregate([
        { $match: { user: userObjectId, type: 'expense' } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $addFields: {
            normalizedDate: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'date'] },
                      ],
                    },
                    then: '$date',
                  },
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'string'] },
                      ],
                    },
                    then: {
                      $dateFromString: {
                        dateString: '$date',
                        onError: referenceDate,
                        onNull: referenceDate,
                      },
                    },
                  },
                ],
                default: referenceDate,
              },
            },
          },
        },
        { $match: { normalizedDate: { $gte: startOfMonth, $lte: referenceDate } } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $addFields: {
            normalizedDate: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'date'] },
                      ],
                    },
                    then: '$date',
                  },
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'string'] },
                      ],
                    },
                    then: {
                      $dateFromString: {
                        dateString: '$date',
                        onError: referenceDate,
                        onNull: referenceDate,
                      },
                    },
                  },
                ],
                default: referenceDate,
              },
            },
          },
        },
        {
          $match: {
            normalizedDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $addFields: {
            normalizedDate: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'date'] },
                      ],
                    },
                    then: '$date',
                  },
                  {
                    case: {
                      $and: [
                        { $ne: ['$date', null] },
                        { $eq: [{ $type: '$date' }, 'string'] },
                      ],
                    },
                    then: {
                      $dateFromString: {
                        dateString: '$date',
                        onError: referenceDate,
                        onNull: referenceDate,
                      },
                    },
                  },
                ],
                default: referenceDate,
              },
            },
          },
        },
        { $match: { normalizedDate: { $gte: startOfMonth, $lte: referenceDate } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$normalizedDate' } },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.day': 1 } },
      ]),
      TaxEstimate.findOne({
        user: userObjectId,
        dueDate: { $exists: true, $gte: realNow },
      })
        .sort({ dueDate: 1 })
        .lean()
        .then((doc) => (doc ? doc : TaxEstimate.findOne({ user: userObjectId }).sort({ dueDate: -1 }).lean())),
      Transaction.find({ user: userObjectId })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const summary = { income: 0, expense: 0, net: 0 };
    totals.forEach((entry) => {
      summary[entry._id] = entry.total;
    });
    summary.net = (summary.income || 0) - (summary.expense || 0);

    const monthlySeries = monthlyAggregate.map((entry) => ({
      month: entry._id.month,
      type: entry._id.type,
      total: entry.total,
    }));

    const monthSummary = { income: 0, expense: 0 };
    currentMonthAggregate.forEach((entry) => {
      monthSummary[entry._id] = entry.total;
    });

    const previousMonthSummary = { income: 0, expense: 0 };
    previousMonthAggregate.forEach((entry) => {
      previousMonthSummary[entry._id] = entry.total;
    });

    const monthlyIncome = monthSummary.income || 0;
    const monthlyExpense = monthSummary.expense || 0;
    const previousIncome = previousMonthSummary.income || 0;
    const previousExpense = previousMonthSummary.expense || 0;

    const incomeChange = previousIncome ? ((monthlyIncome - previousIncome) / previousIncome) * 100 : null;
    const expenseChange = previousExpense
      ? ((monthlyExpense - previousExpense) / previousExpense) * 100
      : null;

    const savingsRate = monthlyIncome ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    const prevSavingsRate = previousIncome ? ((previousIncome - previousExpense) / previousIncome) * 100 : 0;
    const savingsRateChange = previousIncome ? savingsRate - prevSavingsRate : null;

    const estimatedTaxDue = upcomingEstimate?.estimatedTax || 0;
    const estimatedTaxDueDate = upcomingEstimate?.dueDate || null;

    const dailySeries = dailyAggregate.map((entry) => ({
      day: entry._id.day,
      type: entry._id.type,
      total: entry.total,
    }));

    const quarterAccumulator = new Map();
    monthlySeries.forEach((entry) => {
      const [year, monthString] = entry.month.split('-');
      const month = Number(monthString);
      const quarter = Math.floor((month - 1) / 3) + 1;
      const key = `${year}-Q${quarter}`;
      if (!quarterAccumulator.has(key)) {
        quarterAccumulator.set(key, { period: key, income: 0, expense: 0 });
      }
      const bucket = quarterAccumulator.get(key);
      if (entry.type === 'income') {
        bucket.income += entry.total;
      } else {
        bucket.expense += entry.total;
      }
      quarterAccumulator.set(key, bucket);
    });
    const quarterSeries = Array.from(quarterAccumulator.values()).sort((a, b) => a.period.localeCompare(b.period));

    const categoryBreakdown = categoryTotals.map((entry) => ({
      category: entry._id || 'Uncategorized',
      total: entry.total,
    }));

    const metrics = {
      monthlyIncome,
      monthlyExpense,
      incomeChange,
      expenseChange,
      estimatedTaxDue,
      estimatedTaxDueDate,
      savingsRate,
      savingsRateChange,
      netMonthly: monthlyIncome - monthlyExpense,
    };

    return res.json({
      summary,
      monthToDate: monthSummary,
      monthlySeries,
      dailySeries,
      quarterSeries,
      metrics,
      recentTransactions,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Failed to build transaction summary', error);
    return res.status(500).json({ message: 'Failed to build summary' });
  }
};
