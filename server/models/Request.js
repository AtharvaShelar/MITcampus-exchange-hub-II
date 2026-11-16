const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, default: '' },
  buyerId: { type: String, required: true },
  buyerEmail: { type: String, required: true },
  buyerName: { type: String, required: true },
  sellerId: { type: String, required: true },
  sellerEmail: { type: String, required: true },
  sellerName: { type: String, required: true },
  requestType: { 
    type: String, 
    enum: ['purchase', 'exchange', 'rent', 'donation', 'auction_win'], 
    default: 'purchase' 
  },
  offeredPrice: { type: Number },
  proposedExchange: { type: String, default: '' },
  note: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'], 
    default: 'Pending' 
  },
  date: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Request || mongoose.model('Request', RequestSchema);
