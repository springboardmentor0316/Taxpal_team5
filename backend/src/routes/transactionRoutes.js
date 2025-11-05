const express = require('express');
const { body, param } = require('express-validator');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
} = require('../controllers/transactionController');
const validateRequest = require('../middleware/validateRequest');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getTransactions);
router.get('/summary', getSummary);
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid transaction id')],
  validateRequest,
  getTransaction
);

router.post(
  '/',
  [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('date').isISO8601().withMessage('Date must be a valid ISO date'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be under 500 characters'),
  ],
  validateRequest,
  createTransaction
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid transaction id'),
    body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').optional().trim().notEmpty().withMessage('Category is required'),
    body('description').optional().trim().notEmpty().withMessage('Description is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be under 500 characters'),
  ],
  validateRequest,
  updateTransaction
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid transaction id')],
  validateRequest,
  deleteTransaction
);

module.exports = router;
