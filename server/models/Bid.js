const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  listingId: { type: String, required: true },
  listingName: { type: String, default: '' },
  bidderId: { type: String, required: true },
  bidderEmail: { type: String, required: true },
  bidderName: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Bid || mongoose.model('Bid', BidSchema);
