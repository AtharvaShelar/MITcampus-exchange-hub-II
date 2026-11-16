const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notifController');
const { protect } = require('../middleware/auth');

router.get('/', protect, notifController.getNotifications);
router.patch('/:id/read', protect, notifController.markAsRead);
router.patch('/mark-all-read', protect, notifController.markAllAsRead);

module.exports = router;
