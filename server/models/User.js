const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  department: { type: String, required: true },
  year: { type: String, default: '2nd Year' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  joined: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
  wishlist: [{ type: String }],
  rating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
