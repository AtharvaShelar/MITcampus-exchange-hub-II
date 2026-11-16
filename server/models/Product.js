const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: [
      'Textbooks', 'Notes', 'Stationery', 'Electronics', 
      'Lab Equipment', 'Reference Books', 'Drawing Instruments', 'Other'
    ] 
  },
  condition: { 
    type: String, 
    required: true, 
    enum: ['New', 'Like New', 'Good', 'Fair'] 
  },
  listingType: { 
    type: String, 
    enum: ['Sale', 'Rent', 'Exchange', 'Donation'], 
    default: 'Sale' 
  },
  pricingModel: { 
    type: String, 
    enum: ['fixed', 'bidding'], 
    default: 'fixed' 
  },
  price: { type: Number, required: true, min: 0 },
  exchangeFor: { type: String, default: '' },
  rentalPeriod: { type: String, default: '' },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  sellerEmail: { type: String, required: true },
  sellerName: { type: String, default: '' },
  sellerId: { type: String, default: '' },
  sellerDepartment: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'sold', 'exchanged', 'rented', 'donated'], 
    default: 'available' 
  },
  // Bidding / Auction Fields
  startingBid: { type: Number, default: 0 },
  minIncrement: { type: Number, default: 10 },
  currentHighestBid: { type: Number, default: 0 },
  highestBidderEmail: { type: String, default: '' },
  highestBidderName: { type: String, default: '' },
  highestBidderId: { type: String, default: '' },
  bidsCount: { type: Number, default: 0 },
  auctionEnd: { type: Date },
  auctionStatus: { 
    type: String, 
    enum: ['active', 'completed', 'expired'], 
    default: 'active' 
  },
  winningBid: { type: Number },
  winnerEmail: { type: String },
  winnerName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
