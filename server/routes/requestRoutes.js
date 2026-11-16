const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { protect } = require('../middleware/auth');

router.get('/', protect, requestController.getRequests);
router.post('/', protect, requestController.createRequest);
router.patch('/:id/status', protect, requestController.updateRequestStatus);

module.exports = router;
