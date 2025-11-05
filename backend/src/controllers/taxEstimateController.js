const mongoose = require('mongoose');
const TaxEstimate = require('../models/TaxEstimate');

const quarterDueDates = {
  Q1: { month: 4, day: 15 },
  Q2: { month: 6, day: 15 },
  Q3: { month: 9, day: 15 },
  Q4: { month: 1, day: 15 },
};

const resolveDueDate = (year, quarter) => {
  const config = quarterDueDates[quarter];
  if (!config) {
    return null;
  }

  const targetYear = quarter === 'Q4' ? year + 1 : year;
  return new Date(Date.UTC(targetYear, config.month - 1, config.day));
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

exports.listEstimates = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const estimates = await TaxEstimate.find({ user: userObjectId })
      .sort({ year: -1, quarter: 1 })
      .lean();

    return res.json({ estimates });
  } catch (error) {
    console.error('Failed to fetch tax estimates', error);
    return res.status(500).json({ message: 'Failed to fetch tax estimates' });
  }
};

exports.upsertEstimate = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      quarter,
      year: rawYear,
      country,
      state,
      filingStatus,
      grossIncome,
      businessExpenses,
      healthInsurancePremiums,
      retirementContribution,
      homeOfficeDeduction,
      estimatedTax,
      effectiveRate,
      notes,
    } = req.body;

    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return res.status(422).json({ message: 'Quarter must be one of Q1, Q2, Q3, Q4' });
    }

    const year = Number(rawYear) || new Date().getFullYear();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const payload = {
      user: userObjectId,
      quarter,
      year,
      country,
      state,
      filingStatus,
      grossIncome: toNumber(grossIncome),
      businessExpenses: toNumber(businessExpenses),
      healthInsurancePremiums: toNumber(healthInsurancePremiums),
      retirementContribution: toNumber(retirementContribution),
      homeOfficeDeduction: toNumber(homeOfficeDeduction),
      estimatedTax: toNumber(estimatedTax),
      effectiveRate: toNumber(effectiveRate),
      notes,
      dueDate: resolveDueDate(year, quarter),
    };

    const estimate = await TaxEstimate.findOneAndUpdate(
      { user: userObjectId, quarter, year },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: 'Tax estimate saved', estimate });
  } catch (error) {
    console.error('Failed to save tax estimate', error);
    return res.status(500).json({ message: 'Failed to save tax estimate' });
  }
};

exports.deleteEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid identifier' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const estimate = await TaxEstimate.findOneAndDelete({ _id: id, user: userObjectId });

    if (!estimate) {
      return res.status(404).json({ message: 'Tax estimate not found' });
    }

    return res.json({ message: 'Tax estimate deleted' });
  } catch (error) {
    console.error('Failed to delete tax estimate', error);
    return res.status(500).json({ message: 'Failed to delete tax estimate' });
  }
};
