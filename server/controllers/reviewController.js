const db = require('../services/dbAdapter');

// @route   POST /api/reviews
exports.createReview = async (req, res, next) => {
  try {
    const { requestId, rating, comment } = req.body;

    const numRating = Number(rating);
    if (!requestId || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid requestId and a rating between 1 and 5 stars.'
      });
    }

    // Verify the transaction exists and is completed
    const request = await db.requests.findById(requestId) ||
                    await db.requests.findOne({ id: requestId });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Completed transaction record not found.'
      });
    }

    if (request.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted after a transaction has been successfully marked as Completed.'
      });
    }

    const isBuyer = request.buyerEmail === req.user.email;
    const isSeller = request.sellerEmail === req.user.email;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Fraud Prevention: Only verified participants of this transaction can leave a review.'
      });
    }

    const targetEmail = isBuyer ? request.sellerEmail : request.buyerEmail;

    // Fraud prevention: Check for duplicate review by this user for this request
    const existingReview = await db.reviews.findOne({
      requestId: String(request.id || request._id),
      reviewerEmail: req.user.email
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this completed transaction.'
      });
    }

    const newReview = await db.reviews.create({
      requestId: String(request.id || request._id),
      productId: request.productId,
      productName: request.productName,
      reviewerEmail: req.user.email,
      reviewerName: req.user.name,
      targetEmail,
      rating: numRating,
      comment: comment ? comment.trim() : '',
      date: new Date().toLocaleDateString('en-GB')
    });

    // Recalculate average rating for target user
    const allTargetReviews = await db.reviews.find({ targetEmail });
    const totalScore = allTargetReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    const avgRating = Number((totalScore / allTargetReviews.length).toFixed(1));

    const targetUser = await db.users.findOne({ email: targetEmail });
    if (targetUser) {
      await db.users.findByIdAndUpdate(targetUser.id || targetUser._id, {
        rating: avgRating,
        ratingsCount: allTargetReviews.length
      });
    }

    // Notify the reviewed user
    await db.notifications.create({
      id: 'n_' + Date.now() + Math.random().toString(36).substring(2, 6),
      toEmail: targetEmail,
      type: 'review',
      title: '🌟 New Feedback Received',
      message: `${req.user.name} gave you a ${numRating}-star rating for "${request.productName}".`,
      time: new Date().toLocaleString('en-GB'),
      read: false,
      link: 'profile'
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your rating and review have been recorded.',
      review: newReview,
      updatedTargetRating: avgRating
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/reviews/user/:email
exports.getUserReviews = async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    const reviews = await db.reviews.find({ targetEmail: email }, { createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (err) {
    next(err);
  }
};
