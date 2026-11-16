const db = require('../services/dbAdapter');

// @route   GET /api/requests
exports.getRequests = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const { type = 'all' } = req.query; // 'sent', 'received', 'all'

    let query = {};
    if (type === 'sent') {
      query.buyerEmail = userEmail;
    } else if (type === 'received') {
      query.sellerEmail = userEmail;
    } else {
      query.$or = [{ buyerEmail: userEmail }, { sellerEmail: userEmail }];
    }

    const requests = await db.requests.find(query, { createdAt: -1 });

    // Populate product details
    const populated = [];
    for (const r of requests) {
      const prod = await db.products.findById(r.productId);
      populated.push({
        ...r,
        product: prod || null
      });
    }

    res.json({
      success: true,
      count: populated.length,
      requests: populated
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const { productId, note, offeredPrice, proposedExchange, requestType = 'purchase' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await db.products.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product listing not found.' });
    }

    if (product.sellerEmail === req.user.email) {
      return res.status(400).json({ success: false, message: 'You cannot request your own listing.' });
    }

    if (['sold', 'donated', 'exchanged'].includes(product.status)) {
      return res.status(400).json({ success: false, message: 'This item is no longer available.' });
    }

    // Check for existing pending request by this user
    const existing = await db.requests.findOne({
      productId: String(product.id || product._id),
      buyerEmail: req.user.email,
      status: 'Pending'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active pending request for this listing.'
      });
    }

    const newRequest = await db.requests.create({
      productId: String(product.id || product._id),
      productName: product.name,
      buyerId: req.user.id || req.user._id,
      buyerEmail: req.user.email,
      buyerName: req.user.name,
      sellerId: product.sellerId || product.sellerEmail,
      sellerEmail: product.sellerEmail,
      sellerName: product.sellerName || product.sellerEmail,
      requestType,
      offeredPrice: offeredPrice !== undefined ? Number(offeredPrice) : product.price,
      proposedExchange: proposedExchange ? proposedExchange.trim() : '',
      note: note ? note.trim() : '',
      status: 'Pending',
      date: new Date().toLocaleDateString('en-GB')
    });

    // Notify seller
    await db.notifications.create({
      id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
      toEmail: product.sellerEmail,
      type: 'request',
      title: '📦 New Purchase / Exchange Request',
      message: `${req.user.name} sent a ${requestType} request for "${product.name}".`,
      time: new Date().toLocaleString('en-GB'),
      read: false,
      link: 'requests'
    });

    // Log activity
    await db.activities.create({
      type: 'request',
      text: `${req.user.name} sent a request for "${product.name}".`,
      time: new Date().toLocaleString('en-GB')
    });

    res.status(201).json({
      success: true,
      message: 'Request submitted to seller successfully!',
      request: newRequest
    });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/requests/:id/status
exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await db.requests.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const isBuyer = request.buyerEmail === req.user.email;
    const isSeller = request.sellerEmail === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition.' });
    }

    // Role-specific status transitions:
    // Only seller or admin can Accept or Reject
    if (['Accepted', 'Rejected'].includes(status) && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or an administrator can accept or reject this request.'
      });
    }

    // Buyer can Cancel their pending request
    if (status === 'Cancelled' && !isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer or an administrator can cancel this request.'
      });
    }

    // Conflict prevention when Accepting a request:
    if (status === 'Accepted') {
      const product = await db.products.findById(request.productId);
      if (product) {
        // Reserve the product
        await db.products.findByIdAndUpdate(product.id || product._id, { status: 'reserved' });

        // Automatically cancel any other pending requests for the same product to prevent conflicting transactions!
        const otherPending = await db.requests.find({
          productId: String(product.id || product._id),
          status: 'Pending'
        });

        for (const other of otherPending) {
          if (String(other.id || other._id) !== String(request.id || request._id)) {
            await db.requests.findByIdAndUpdate(other.id || other._id, { status: 'Cancelled' });
            await db.notifications.create({
              id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
              toEmail: other.buyerEmail,
              type: 'request',
              title: 'Request Cancelled',
              message: `Your request for "${product.name}" was cancelled because the seller accepted another request.`,
              time: new Date().toLocaleString('en-GB'),
              read: false,
              link: 'requests'
            });
          }
        }
      }
    }

    // When transaction is completed
    if (status === 'Completed') {
      const product = await db.products.findById(request.productId);
      if (product) {
        let finalStatus = 'sold';
        if (request.requestType === 'exchange') finalStatus = 'exchanged';
        if (request.requestType === 'rent') finalStatus = 'rented';
        if (request.requestType === 'donation') finalStatus = 'donated';

        await db.products.findByIdAndUpdate(product.id || product._id, { status: finalStatus });
      }

      // Prompt buyer and seller to leave a review
      await db.notifications.create({
        id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
        toEmail: isBuyer ? request.sellerEmail : request.buyerEmail,
        type: 'review',
        title: '⭐ Transaction Completed - Leave a Review!',
        message: `Your transaction for "${request.productName}" is marked complete. Share your feedback and rating!`,
        time: new Date().toLocaleString('en-GB'),
        read: false,
        link: 'profile'
      });
    }

    const updated = await db.requests.findByIdAndUpdate(request.id || request._id, { status });

    // Send status notification to opposite party
    const targetEmail = isSeller ? request.buyerEmail : request.sellerEmail;
    await db.notifications.create({
      id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
      toEmail: targetEmail,
      type: 'request',
      title: `Request ${status}`,
      message: `${req.user.name} marked the request for "${request.productName}" as ${status}.`,
      time: new Date().toLocaleString('en-GB'),
      read: false,
      link: 'requests'
    });

    await db.activities.create({
      type: 'request',
      text: `Request for "${request.productName}" was updated to ${status}.`,
      time: new Date().toLocaleString('en-GB')
    });

    res.json({
      success: true,
      message: `Request status updated to ${status}.`,
      request: updated
    });
  } catch (err) {
    next(err);
  }
};
