const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  linkedinUrl: String,
  githubUrl: String,
  portfolioUrl: String,
  location: String,
  cvText: String,
  cvFilePath: String,
  workAuthorization: {
    type: String,
    enum: ['Yes', 'No']
  },
  requiresSponsorship: {
    type: String,
    enum: ['Yes', 'No']
  },
  preferredSalary: String,
  availableFrom: String,
  staticAnswers: {
    type: Map,
    of: String
  }
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
