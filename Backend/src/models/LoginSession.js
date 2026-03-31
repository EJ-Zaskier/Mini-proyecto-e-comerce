const mongoose = require('mongoose');

const LoginSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: 'unknown'
  },
  loggedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  versionKey: false
});

module.exports = mongoose.model('LoginSession', LoginSessionSchema);
