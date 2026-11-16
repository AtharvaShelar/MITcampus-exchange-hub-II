const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.get('/', protect, wishlistController.getWishlist);
router.post('/toggle/:productId', protect, wishlistController.toggleWishlist);

module.exports = router;
