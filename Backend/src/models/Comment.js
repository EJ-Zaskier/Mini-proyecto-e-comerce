const mongoose = require('mongoose');


const CommentSchema = new mongoose.Schema({
  contenido: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 280
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});


module.exports = mongoose.model('Comment', CommentSchema);
