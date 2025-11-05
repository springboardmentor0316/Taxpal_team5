const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

const computeStatus = (spent, limit) => {
  if (!limit) {
    return spent > 0 ? 'Bad' : 'Good';
  }
  const ratio = spent / limit;
  if (ratio < 0.8) return 'Good';
  if (ratio <= 1) return 'Warning';
  return 'Bad';
};

const normalizeMonth = (input) => {
  if (!input) return null;
  const match = /^\d{4}-\d{2}$/.exec(input.trim());
  if (!match) return null;
  return match[0];
};

exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const filter = { user: userObjectId };
    const monthFilter = normalizeMonth(req.query.month);
    if (monthFilter) {
      filter.month = monthFilter;
    }

    const budgets = await Budget.find(filter).sort({ month: 1, category: 1 }).lean();

    if (budgets.length === 0) {
      return res.json({ budgets: [], summary: { totalLimit: 0, totalSpent: 0, totalRemaining: 0, health: 'Good' } });
    }

    const months = Array.from(new Set(budgets.map((b) => b.month)));
    const categories = Array.from(new Set(budgets.map((b) => b.category)));

    const totals = await Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: 'expense',
          category: { $in: categories },
        },
      },
      {
        $addFields: {
          monthKey: { $dateToString: { format: '%Y-%m', date: '$date' } },
        },
      },
      {
        $match: {
          monthKey: { $in: months },
        },
      },
      {
        $group: {
          _id: { category: '$category', month: '$monthKey' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const spentMap = totals.reduce((acc, item) => {
      const key = `${item._id.category}|${item._id.month}`;
      acc[key] = item.total;
      return acc;
    }, {});

    let totalLimit = 0;
    let totalSpent = 0;

    const enriched = budgets.map((budget) => {
      const key = `${budget.category}|${budget.month}`;
      const spent = spentMap[key] || 0;
      const remaining = Math.max(0, budget.limit - spent);
      totalLimit += budget.limit;
      totalSpent += spent;
      return {
        ...budget,
        spent,
        remaining,
        status: computeStatus(spent, budget.limit),
      };
    });

    const totalRemaining = Math.max(0, totalLimit - totalSpent);
    const summary = {
      totalLimit,
      totalSpent,
      totalRemaining,
      health: computeStatus(totalSpent, totalLimit),
    };

    return res.json({ budgets: enriched, summary });
  } catch (error) {
    console.error('Failed to fetch budgets', error);
    return res.status(500).json({ message: 'Failed to fetch budgets' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { category, limit, month, note } = req.body;
    const normalizedMonth = normalizeMonth(month);

    if (!normalizedMonth) {
      return res.status(422).json({ message: 'Month must be in YYYY-MM format' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const numericLimit = Number(limit);

    if (!Number.isFinite(numericLimit) || numericLimit < 0) {
      return res.status(422).json({ message: 'Limit must be a positive number' });
    }

    const trimmedCategory = typeof category === 'string' ? category.trim() : '';

    if (!trimmedCategory) {
      return res.status(422).json({ message: 'Category is required' });
    }

    const existingCategory = await Category.findOne({
      user: userObjectId,
      name: trimmedCategory,
      type: 'expense',
    }).lean();

    if (!existingCategory) {
      return res.status(422).json({ message: 'Select a category from your expense categories' });
    }

    const budget = await Budget.create({
      user: userObjectId,
      category: trimmedCategory,
      limit: numericLimit,
      month: normalizedMonth,
      note,
    });

    return res.status(201).json({ message: 'Budget created successfully', budget });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Budget for this category and month already exists' });
    }
    console.error('Failed to create budget', error);
    return res.status(500).json({ message: 'Failed to create budget' });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const normalizedMonth = normalizeMonth(req.body.month);

    const update = {};
    ['category', 'limit', 'note'].forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        if (field === 'limit') {
          const numeric = Number(req.body[field]);
          if (!Number.isFinite(numeric) || numeric < 0) {
            throw new Error('INVALID_LIMIT');
          }
          update[field] = numeric;
        } else {
          update[field] = req.body[field];
        }
      }
    });

    if (typeof update.category === 'string') {
      update.category = update.category.trim();
      if (!update.category) {
        return res.status(422).json({ message: 'Category is required' });
      }
      const categoryDoc = await Category.findOne({
        user: new mongoose.Types.ObjectId(req.user.id),
        name: update.category,
        type: 'expense',
      }).lean();
      if (!categoryDoc) {
        return res.status(422).json({ message: 'Select a category from your expense categories' });
      }
    }

    if (normalizedMonth) {
      update.month = normalizedMonth;
    }

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const budget = await Budget.findOneAndUpdate({ _id: id, user: userObjectId }, update, {
      new: true,
      runValidators: true,
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    return res.json({ message: 'Budget updated successfully', budget });
  } catch (error) {
    if (error.message === 'INVALID_LIMIT') {
      return res.status(422).json({ message: 'Limit must be a positive number' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Budget for this category and month already exists' });
    }
    console.error('Failed to update budget', error);
    return res.status(500).json({ message: 'Failed to update budget' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const budget = await Budget.findOneAndDelete({ _id: id, user: userObjectId });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    return res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Failed to delete budget', error);
    return res.status(500).json({ message: 'Failed to delete budget' });
  }
};
