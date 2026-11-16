const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const bidController = require('../controllers/bidController');
const { protect, optionalAuth } = require('../middleware/auth');

// Products
router.get('/', optionalAuth, productController.getProducts);
router.get('/:id', optionalAuth, productController.getProductById);
router.post('/', protect, productController.createProduct);
router.put('/:id', protect, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);
router.patch('/:id/status', protect, productController.updateProductStatus);

// Bidding integration on product routes
router.post('/:id/bid', protect, bidController.placeBid);
router.get('/:id/bids', optionalAuth, bidController.getProductBids);

module.exports = router;
