const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  talla: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 1,
    maxlength: 12,
    default: 'UNITALLA'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  }
}, {
  _id: true
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: {
    type: [CartItemSchema],
    default: []
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Cart', CartSchema);
