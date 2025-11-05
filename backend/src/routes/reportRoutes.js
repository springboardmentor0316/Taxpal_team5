const express = require('express');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { listReports, createReport, deleteReport } = require('../controllers/reportController');

const router = express.Router();

router.use(auth);

router.get('/', listReports);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('period').trim().notEmpty().withMessage('Period is required'),
    body('reportType').trim().notEmpty().withMessage('Report type is required'),
    body('format').trim().notEmpty().withMessage('Format is required'),
  ],
  validateRequest,
  createReport
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid report id')],
  validateRequest,
  deleteReport
);

module.exports = router;
