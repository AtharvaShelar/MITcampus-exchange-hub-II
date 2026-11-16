const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  toEmail: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['request', 'message', 'sold', 'report', 'bid', 'auction_win', 'outbid', 'review', 'general'], 
    default: 'general' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleString('en-GB') },
  read: { type: Boolean, default: false },
  link: { type: String, default: 'home' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
