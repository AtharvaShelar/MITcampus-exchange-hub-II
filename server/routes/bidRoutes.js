const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');
const { protect } = require('../middleware/auth');

router.get('/my-bids', protect, bidController.getMyBids);

module.exports = router;
