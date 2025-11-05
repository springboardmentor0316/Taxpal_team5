const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const {
  listEstimates,
  upsertEstimate,
  deleteEstimate,
} = require('../controllers/taxEstimateController');

const router = express.Router();

router.use(auth);

router.get('/', listEstimates);

router.post(
  '/',
  [
    body('quarter').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('Quarter must be Q1-Q4'),
    body('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be valid'),
    body('grossIncome').isFloat({ min: 0 }).withMessage('Gross income must be positive'),
    body('businessExpenses').optional().isFloat({ min: 0 }).withMessage('Expenses must be positive'),
    body('healthInsurancePremiums').optional().isFloat({ min: 0 }).withMessage('Premiums must be positive'),
    body('retirementContribution').optional().isFloat({ min: 0 }).withMessage('Retirement contribution must be positive'),
    body('homeOfficeDeduction').optional().isFloat({ min: 0 }).withMessage('Home office deduction must be positive'),
    body('estimatedTax').isFloat({ min: 0 }).withMessage('Estimated tax must be positive'),
    body('effectiveRate').optional().isFloat({ min: 0 }).withMessage('Effective rate must be positive'),
  ],
  validateRequest,
  upsertEstimate
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid estimate id')],
  validateRequest,
  deleteEstimate
);

module.exports = router;
