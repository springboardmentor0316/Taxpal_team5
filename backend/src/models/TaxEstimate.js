const mongoose = require('mongoose');

const taxEstimateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    quarter: {
      type: String,
      enum: ['Q1', 'Q2', 'Q3', 'Q4'],
      required: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    filingStatus: {
      type: String,
      trim: true,
    },
    grossIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    businessExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },
    healthInsurancePremiums: {
      type: Number,
      default: 0,
      min: 0,
    },
    retirementContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    homeOfficeDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedTax: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

taxEstimateSchema.index({ user: 1, year: 1, quarter: 1 }, { unique: true });

module.exports = mongoose.model('TaxEstimate', taxEstimateSchema);
