const db = require('../services/dbAdapter');
const { checkAndFinalizeAuctions } = require('../services/auctionService');

// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    // Run auction expiration sweep
    await checkAndFinalizeAuctions();

    const {
      search,
      category,
      condition,
      listingType,
      pricingModel,
      status,
      sort = 'newest',
      seller
    } = req.query;

    let query = {};

    // Availability filter: default to showing available unless specified
    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (condition && condition !== 'All') {
      query.condition = condition;
    }

    if (listingType && listingType !== 'All') {
      query.listingType = listingType;
    }

    if (pricingModel && pricingModel !== 'All') {
      query.pricingModel = pricingModel;
    }

    if (seller) {
      query.sellerEmail = seller;
    }

    let products = await db.products.find(query);

    // Text search in memory/query
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      products = products.filter(p => {
        const text = `${p.name} ${p.category} ${p.description} ${p.condition} ${p.listingType}`.toLowerCase();
        return text.includes(term);
      });
    }

    // Sorting logic
    if (sort === 'price-asc') {
      products.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sort === 'price-desc') {
      products.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sort === 'ending-soonest') {
      products.sort((a, b) => {
        if (!a.auctionEnd) return 1;
        if (!b.auctionEnd) return -1;
        return new Date(a.auctionEnd) - new Date(b.auctionEnd);
      });
    } else if (sort === 'most-bids') {
      products.sort((a, b) => (b.bidsCount || 0) - (a.bidsCount || 0));
    } else {
      // Default: newest first
      products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    await checkAndFinalizeAuctions();

    const product = await db.products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product listing not found.'
      });
    }

    // Fetch seller profile & rating
    const seller = await db.users.findOne({ email: product.sellerEmail });

    // Fetch bidding history if it is an auction
    let bids = [];
    if (product.pricingModel === 'bidding') {
      bids = await db.bids.find({ listingId: String(product.id || product._id) }, { amount: -1, createdAt: 1 });
    }

    // Fetch reviews for this seller
    const sellerReviews = await db.reviews.find({ targetEmail: product.sellerEmail }, { createdAt: -1 });

    res.json({
      success: true,
      product: {
        ...product,
        sellerDetails: seller ? {
          name: seller.name,
          department: seller.department,
          year: seller.year,
          rating: seller.rating || 5.0,
          ratingsCount: seller.ratingsCount || 0,
          joined: seller.joined
        } : null,
        bids,
        sellerReviews
      }
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      condition,
      listingType = 'Sale',
      pricingModel = 'fixed',
      price,
      exchangeFor,
      rentalPeriod,
      description,
      image,
      startingBid,
      minIncrement,
      auctionDurationHours
    } = req.body;

    if (!name || !category || !condition || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, category, condition, and description.'
      });
    }

    const numPrice = Number(price) || 0;
    if (listingType === 'Sale' && pricingModel === 'fixed' && numPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than zero for fixed-price sales.'
      });
    }

    let auctionFields = {};
    if (listingType === 'Sale' && pricingModel === 'bidding') {
      const startBid = Number(startingBid);
      const increment = Number(minIncrement) || 10;
      const durationHours = Number(auctionDurationHours) || 48; // default 48h

      if (isNaN(startBid) || startBid <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Please specify a valid starting bid greater than zero.'
        });
      }

      if (increment < 1) {
        return res.status(400).json({
          success: false,
          message: 'Minimum bid increment must be at least ₹1.'
        });
      }

      const auctionEnd = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      auctionFields = {
        pricingModel: 'bidding',
        price: startBid,
        startingBid: startBid,
        minIncrement: increment,
        currentHighestBid: 0,
        highestBidderEmail: '',
        highestBidderName: '',
        highestBidderId: '',
        bidsCount: 0,
        auctionEnd,
        auctionStatus: 'active'
      };
    } else {
      auctionFields = {
        pricingModel: 'fixed',
        price: listingType === 'Donation' ? 0 : numPrice
      };
    }

    const newProduct = await db.products.create({
      name: name.trim(),
      category,
      condition,
      listingType,
      ...auctionFields,
      exchangeFor: exchangeFor ? exchangeFor.trim() : '',
      rentalPeriod: rentalPeriod ? rentalPeriod.trim() : '',
      description: description.trim(),
      image: image ? image.trim() : '',
      sellerEmail: req.user.email,
      sellerName: req.user.name,
      sellerId: req.user.id || req.user._id,
      sellerDepartment: req.user.department,
      status: 'available',
      createdAt: new Date().toISOString()
    });

    await db.activities.create({
      type: 'listing',
      text: `${req.user.name} listed "${newProduct.name}" (${listingType}${pricingModel === 'bidding' ? ' - Bidding' : ''}).`,
      time: new Date().toLocaleString('en-GB')
    });

    res.status(201).json({
      success: true,
      message: 'Product listed successfully on the campus marketplace!',
      product: newProduct
    });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwner = product.sellerEmail === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this listing.' });
    }

    // If active auction with bids, disallow changing core pricing fields to prevent fraud
    if (product.pricingModel === 'bidding' && product.bidsCount > 0) {
      if (req.body.startingBid && Number(req.body.startingBid) !== product.startingBid) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify starting bid after bids have already been placed on this auction.'
        });
      }
    }

    const updateFields = {
      name: req.body.name !== undefined ? req.body.name.trim() : product.name,
      category: req.body.category || product.category,
      condition: req.body.condition || product.condition,
      description: req.body.description !== undefined ? req.body.description.trim() : product.description,
      image: req.body.image !== undefined ? req.body.image.trim() : product.image,
      exchangeFor: req.body.exchangeFor !== undefined ? req.body.exchangeFor : product.exchangeFor,
      rentalPeriod: req.body.rentalPeriod !== undefined ? req.body.rentalPeriod : product.rentalPeriod
    };

    if (product.pricingModel !== 'bidding' && req.body.price !== undefined) {
      updateFields.price = Number(req.body.price) || 0;
    }

    const updated = await db.products.findByIdAndUpdate(product.id || product._id, updateFields);

    await db.activities.create({
      type: 'listing',
      text: `${req.user.name} updated the listing "${updated.name}".`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: 'Listing updated successfully.',
      product: updated
    });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwner = product.sellerEmail === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this listing.' });
    }

    const prodId = String(product.id || product._id);

    // Delete product
    await db.products.deleteOne({ _id: prodId });

    // Clean up related requests (cancel pending)
    await db.requests.updateMany(
      { productId: prodId, status: 'Pending' },
      { status: 'Cancelled' }
    );

    await db.activities.create({
      type: 'listing',
      text: `Listing "${product.name}" was removed by ${isAdmin && !isOwner ? 'an administrator' : 'the seller'}.`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: 'Listing successfully deleted.'
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/products/:id/status
exports.updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const product = await db.products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwner = product.sellerEmail === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to change status.' });
    }

    const validStatuses = ['available', 'reserved', 'sold', 'exchanged', 'rented', 'donated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid listing status.' });
    }

    const updated = await db.products.findByIdAndUpdate(product.id || product._id, { status });

    // Notify any pending buyers if marked as sold
    if (['sold', 'exchanged', 'rented', 'donated'].includes(status)) {
      const pendingReqs = await db.requests.find({
        productId: String(product.id || product._id),
        status: 'Pending'
      });

      for (const r of pendingReqs) {
        await db.notifications.create({
          id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
          toEmail: r.buyerEmail,
          type: 'sold',
          title: 'Listing Marked as Sold',
          message: `The item "${product.name}" has been marked as ${status} by the seller.`,
          time: new Date().toLocaleString('en-GB'),
          read: false,
          link: 'requests'
        });
      }
    }

    res.json({
      success: true,
      message: `Listing marked as ${status}.`,
      product: updated
    });
  } catch (err) {
    next(err);
  }
};
