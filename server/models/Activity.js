const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  type: {
    type: String,
    enum: ['listing', 'request', 'report', 'sold', 'user', 'bid', 'auction'],
    default: 'listing'
  },
  text: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleString('en-GB') },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
