const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(auth);

router.get(
  '/',
  [query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format')],
  validateRequest,
  getBudgets
);

router.post(
  '/',
  [
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('limit').isFloat({ min: 0 }).withMessage('Limit must be a positive number').toFloat(),
    body('month').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be under 500 characters'),
  ],
  validateRequest,
  createBudget
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid budget id'),
    body('category').optional().trim().notEmpty().withMessage('Category is required'),
    body('limit').optional().isFloat({ min: 0 }).withMessage('Limit must be a positive number').toFloat(),
    body('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be under 500 characters'),
  ],
  validateRequest,
  updateBudget
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid budget id')],
  validateRequest,
  deleteBudget
);

module.exports = router;
