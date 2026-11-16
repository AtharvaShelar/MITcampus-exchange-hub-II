const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['Product', 'User'] },
  targetId: { type: String, required: true },
  targetLabel: { type: String, required: true },
  reporterEmail: { type: String, required: true },
  reporterName: { type: String, default: '' },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'Under Review', 'Resolved', 'Dismissed'], 
    default: 'Pending' 
  },
  date: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
