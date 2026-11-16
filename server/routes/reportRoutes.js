const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, reportController.createReport);
router.get('/', protect, reportController.getReports);
router.patch('/:id', protect, authorize('admin'), reportController.updateReportStatus);

module.exports = router;
