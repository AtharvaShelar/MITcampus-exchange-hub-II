const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  productId: { type: String, required: true },
  productName: { type: String, default: '' },
  reviewerEmail: { type: String, required: true },
  reviewerName: { type: String, required: true },
  targetEmail: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  date: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
