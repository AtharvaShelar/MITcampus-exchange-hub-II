const db = require('../services/dbAdapter');
const { checkAndFinalizeAuctions } = require('../services/auctionService');

// @route   POST /api/products/:id/bid
// Atomic bid placement with full concurrency and validation checks
exports.placeBid = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const bidAmount = Number(req.body.amount);

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive bid amount.'
      });
    }

    // Refresh auction statuses
    await checkAndFinalizeAuctions();

    const product = await db.products.findById(listingId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product listing not found.'
      });
    }

    if (product.pricingModel !== 'bidding') {
      return res.status(400).json({
        success: false,
        message: 'This product is a fixed-price listing and does not accept bids.'
      });
    }

    // Check auction active status
    if (product.auctionStatus !== 'active' || product.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'This auction is closed or no longer accepting bids.'
      });
    }

    // Check expiration deadline
    const now = new Date();
    if (product.auctionEnd && new Date(product.auctionEnd) <= now) {
      return res.status(400).json({
        success: false,
        message: 'The bidding deadline for this auction has passed.'
      });
    }

    // Rule: Seller cannot bid on their own listing
    if (product.sellerEmail === req.user.email) {
      return res.status(400).json({
        success: false,
        message: 'You cannot place bids on your own listing.'
      });
    }

    // Rule: Institute verification required
    if (req.user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Your institute email must be verified before participating in auctions.'
      });
    }

    // Concurrency and increment calculation
    const startingBid = Number(product.startingBid) || 0;
    const minIncrement = Number(product.minIncrement) || 10;
    const currentHighest = Number(product.currentHighestBid) || 0;
    const bidsCount = Number(product.bidsCount) || 0;

    let minRequiredBid;
    if (bidsCount === 0) {
      minRequiredBid = startingBid;
    } else {
      minRequiredBid = currentHighest + minIncrement;
    }

    if (bidAmount < minRequiredBid) {
      return res.status(400).json({
        success: false,
        message: `Your bid of ₹${bidAmount} is too low. The minimum valid bid is ₹${minRequiredBid} (current highest ₹${currentHighest} + increment ₹${minIncrement}).`
      });
    }

    // Remember previous highest bidder for outbid notification
    const previousHighestEmail = product.highestBidderEmail;
    const previousHighestBid = product.currentHighestBid;

    // Create the Bid entry
    const newBid = await db.bids.create({
      listingId: String(product.id || product._id),
      listingName: product.name,
      bidderId: req.user.id || req.user._id,
      bidderEmail: req.user.email,
      bidderName: req.user.name,
      amount: bidAmount,
      createdAt: new Date().toISOString()
    });

    // Update Product highest bid atomically
    const updatedProduct = await db.products.findByIdAndUpdate(product.id || product._id, {
      currentHighestBid: bidAmount,
      highestBidderEmail: req.user.email,
      highestBidderName: req.user.name,
      highestBidderId: req.user.id || req.user._id,
      bidsCount: bidsCount + 1
    });

    // Notify previous highest bidder if they were outbid by someone else
    if (previousHighestEmail && previousHighestEmail !== req.user.email) {
      await db.notifications.create({
        id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
        toEmail: previousHighestEmail,
        type: 'outbid',
        title: '⚠️ You Have Been Outbid!',
        message: `Another student placed a higher bid of ₹${bidAmount} on "${product.name}". Previous bid was ₹${previousHighestBid}.`,
        time: new Date().toLocaleString('en-GB'),
        read: false,
        link: 'browse'
      });
    }

    // Notify seller of new bid
    await db.notifications.create({
      id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
      toEmail: product.sellerEmail,
      type: 'bid',
      title: '📈 New Bid Placed on Your Listing',
      message: `${req.user.name} placed a new highest bid of ₹${bidAmount} on "${product.name}".`,
      time: new Date().toLocaleString('en-GB'),
      read: false,
      link: 'listings'
    });

    // Log platform activity
    await db.activities.create({
      type: 'bid',
      text: `${req.user.name} placed a bid of ₹${bidAmount} on "${product.name}".`,
      time: new Date().toLocaleString('en-GB')
    });

    res.status(201).json({
      success: true,
      message: `Your bid of ₹${bidAmount} has been placed successfully! You are currently the highest bidder.`,
      bid: newBid,
      product: updatedProduct
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/products/:id/bids
exports.getProductBids = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const bids = await db.bids.find({ listingId }, { amount: -1, createdAt: 1 });

    res.json({
      success: true,
      count: bids.length,
      bids
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/bids/my-bids
exports.getMyBids = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const myBids = await db.bids.find({ bidderEmail: userEmail }, { createdAt: -1 });

    // Attach product information for rich dashboard display
    const enriched = [];
    for (const b of myBids) {
      const prod = await db.products.findById(b.listingId);
      enriched.push({
        ...b,
        product: prod || null,
        isWinning: prod ? prod.highestBidderEmail === userEmail : false
      });
    }

    res.json({
      success: true,
      count: enriched.length,
      bids: enriched
    });
  } catch (err) {
    next(err);
  }
};
