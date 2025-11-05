const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.use(auth);

router.get('/', listCategories);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('color').optional().isString(),
  ],
  validateRequest,
  createCategory
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid category id'),
    body('name').optional().trim().notEmpty().withMessage('Name must not be empty'),
    body('color').optional().isString(),
  ],
  validateRequest,
  updateCategory
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid category id')],
  validateRequest,
  deleteCategory
);

module.exports = router;
