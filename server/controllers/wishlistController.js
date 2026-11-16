const db = require('../services/dbAdapter');

// @route   GET /api/wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await db.users.findById(req.user.id || req.user._id);
    const wishlistIds = user.wishlist || [];

    const products = [];
    for (const pid of wishlistIds) {
      const prod = await db.products.findById(pid);
      if (prod) products.push(prod);
    }

    res.json({
      success: true,
      count: products.length,
      wishlist: products
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/wishlist/toggle/:productId
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const user = await db.users.findById(req.user.id || req.user._id);

    const product = await db.products.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let wishlist = user.wishlist || [];
    const exists = wishlist.includes(productId);

    if (exists) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }

    await db.users.findByIdAndUpdate(user.id || user._id, { wishlist });

    res.json({
      success: true,
      isWishlisted: !exists,
      message: !exists ? `Added "${product.name}" to your wishlist.` : `Removed "${product.name}" from your wishlist.`,
      wishlist
    });
  } catch (err) {
    next(err);
  }
};
