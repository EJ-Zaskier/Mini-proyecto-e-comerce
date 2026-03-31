const mongoose = require('mongoose');
const { PRODUCT_TYPES, PRODUCT_CATEGORIES, PRODUCT_SEGMENTS } = require('../constants/product');

const normalizeTalla = (value = '') => String(value).trim().toUpperCase();

const ProductSizeSchema = new mongoose.Schema({
  talla: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 1,
    maxlength: 12
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  _id: false
});

const sanitizeSizes = (sizes) => {
  if (!Array.isArray(sizes)) return [];

  const aggregated = new Map();
  for (const item of sizes) {
    const rawLabel = item?.talla;
    const label = normalizeTalla(rawLabel);
    const parsedStock = Number.parseInt(item?.stock, 10);

    if (!label || Number.isNaN(parsedStock) || parsedStock < 0) {
      continue;
    }

    aggregated.set(label, (aggregated.get(label) || 0) + parsedStock);
  }

  return [...aggregated.entries()].map(([talla, stock]) => ({ talla, stock }));
};

const ProductSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  tipo: {
    type: String,
    enum: PRODUCT_TYPES,
    default: 'producto'
  },
  categoria: {
    type: String,
    enum: PRODUCT_CATEGORIES,
    default: 'otros'
  },
  segmento: {
    type: String,
    enum: PRODUCT_SEGMENTS,
    default: 'unisex',
    index: true
  },
  tallas: {
    type: [ProductSizeSchema],
    default: []
  },
  imagenUrl: {
    type: String,
    trim: true,
    default: ''
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

ProductSchema.index({ nombre: 'text', descripcion: 'text' });
ProductSchema.index({ categoria: 1, segmento: 1, tipo: 1, precio: 1 });

ProductSchema.pre('validate', function preValidate() {
  this.tallas = sanitizeSizes(this.tallas);

  if (this.tallas.length > 0) {
    this.stock = this.tallas.reduce((acc, current) => acc + current.stock, 0);
  }
});


module.exports = mongoose.model('Product', ProductSchema);
