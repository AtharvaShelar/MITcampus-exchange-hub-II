const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  from: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) },
  createdAt: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  participants: [{ type: String, required: true }],
  withEmail: { type: String }, // convenience pointer for direct pairing
  productId: { type: String, default: null },
  messages: [MessageSchema],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
