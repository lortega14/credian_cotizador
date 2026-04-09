const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['LOGIN', 'QUOTE_GENERATED', 'COMPANY_CREATED', 'COMPANY_MODIFIED', 'COMPANY_DELETED'],
    required: true
  },
  details: {
    type: Object, // Flexible for storing extra metadata
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
