const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: String,
  company: String,
  url: {
    type: String,
    unique: true,
    required: true
  },
  source: {
    type: String,
    enum: ['himalayas', 'remotive', 'remoteok', 'arbeitnow', 'jobicy', 'findwork', 'adzuna', 'themuse', 'landingjobs', 'workingnomads', 'other']
  },
  ats: {
    type: String,
    enum: ['greenhouse', 'lever', 'unknown']
  },
  jobId: String,
  boardToken: String,
  description: String,
  location: String,
  salary: String,
  category: String,
  matchScore: {
    type: Number,
    min: 1,
    max: 10
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  applied: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Job', JobSchema);
