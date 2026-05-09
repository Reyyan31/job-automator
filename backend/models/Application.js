const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['applied', 'failed', 'skipped', 'review'],
    required: true
  },
  errorMessage: String,
  missingFields: [String],
  geminiAnswers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  coverLetterUsed: String
});

module.exports = mongoose.model('Application', ApplicationSchema);
