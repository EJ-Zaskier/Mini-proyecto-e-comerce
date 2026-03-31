const Product = require('../models/Product');
const { matchedData } = require('express-validator');
const { logAudit } = require('../utils/auditLogger');

const normalizeTalla = (value = '') => String(value).trim().toUpperCase();

const findSizeStock = (product, talla) => {
  if (!Array.isArray(product.tallas) || product.tallas.length === 0) {
    return null;
  }

  const normalized = normalizeTalla(talla);
  return product.tallas.find((size) => size.talla === normalized) || null;
};

exports.create = async (req, res) => {
  const body = matchedData(req, {
    locations: ['body']
  });

  const product = await Product.create({
    ...body,
    creadoPor: req.user.id
  });

  await logAudit({
    req,
    user: req.user,
    action: 'product.created',
    resourceType: 'product',
    resourceId: product._id,
    details: {
      nombre: product.nombre,
      stock: product.stock
    }
  });

  return res.status(201).json({ product });
};


exports.list = async (req, res) => {
  const query = matchedData(req, {
    locations: ['query']
  });

  const page = Number.parseInt(query.page || 1, 10);
  const limit = Number.parseInt(query.limit || 12, 10);
  const skip = (page - 1) * limit;

  const filters = { activo: true };
  const {
    q,
    categoria,
    tipo,
    segmento,
    minPrecio,
    maxPrecio
  } = query;

  if (q) {
    filters.$text = { $search: q };
  }

  if (categoria) {
    filters.categoria = categoria;
  }

  if (tipo) {
    filters.tipo = tipo;
  }

  if (segmento) {
    filters.segmento = segmento;
  }

  if (minPrecio || maxPrecio) {
    filters.precio = {};
    if (minPrecio) filters.precio.$gte = Number(minPrecio);
    if (maxPrecio) filters.precio.$lte = Number(maxPrecio);
  }

  const [products, total] = await Promise.all([
    Product.find(filters)
      .populate('creadoPor', 'nombre email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filters)
  ]);

  return res.status(200).json({
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
};


exports.update = async (req, res) => {
  const body = matchedData(req, {
    locations: ['body']
  });

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  const isOwner = product.creadoPor.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'No tienes permisos para editar este producto' });
  }

  Object.assign(product, body);
  await product.save();

  await logAudit({
    req,
    user: req.user,
    action: 'product.updated',
    resourceType: 'product',
    resourceId: product._id,
    details: {
      nombre: product.nombre
    }
  });

  return res.status(200).json({ product });
};


exports.remove = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  const isOwner = product.creadoPor.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'No tienes permisos para eliminar este producto' });
  }

  product.activo = false;
  await product.save();

  await logAudit({
    req,
    user: req.user,
    action: 'product.deleted',
    resourceType: 'product',
    resourceId: product._id,
    details: {
      nombre: product.nombre
    }
  });

  return res.status(200).json({ message: 'Producto eliminado correctamente' });
};

exports.getById = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, activo: true }).populate('creadoPor', 'nombre email');

  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  return res.status(200).json({ product });
};

exports.purchase = async (req, res) => {
  const { quantity, talla } = matchedData(req, {
    locations: ['body']
  });
  const normalizedTalla = normalizeTalla(talla || '');
  const existingProduct = await Product.findOne({ _id: req.params.id, activo: true });

  if (!existingProduct) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  if (existingProduct.tallas.length > 0) {
    if (!normalizedTalla) {
      return res.status(400).json({ message: 'Debes seleccionar una talla para este producto' });
    }

    const matchingSize = findSizeStock(existingProduct, normalizedTalla);
    if (!matchingSize) {
      return res.status(400).json({ message: 'La talla seleccionada no existe para este producto' });
    }

    const updatedProductBySize = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        activo: true,
        tallas: {
          $elemMatch: {
            talla: normalizedTalla,
            stock: { $gte: quantity }
          }
        }
      },
      {
        $inc: {
          'tallas.$.stock': -quantity,
          stock: -quantity
        }
      },
      {
        new: true
      }
    );

    if (!updatedProductBySize) {
      return res.status(409).json({ message: 'No hay stock suficiente para la talla seleccionada' });
    }

    await logAudit({
      req,
      user: req.user,
      action: 'product.quick_purchase',
      resourceType: 'product',
      resourceId: updatedProductBySize._id,
      details: {
        quantity,
        talla: normalizedTalla,
        remainingStock: updatedProductBySize.stock
      }
    });

    return res.status(200).json({
      message: 'Compra simulada exitosa',
      purchase: {
        productId: updatedProductBySize._id,
        buyerId: req.user.id,
        quantity,
        talla: normalizedTalla,
        total: Number((updatedProductBySize.precio * quantity).toFixed(2)),
        simulatedAt: new Date().toISOString()
      },
      remainingStock: updatedProductBySize.stock
    });
  }

  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: req.params.id,
      activo: true,
      stock: { $gte: quantity }
    },
    {
      $inc: { stock: -quantity }
    },
    {
      new: true
    }
  );

  if (!updatedProduct) {
    return res.status(409).json({ message: 'No hay stock suficiente para completar la compra' });
  }

  await logAudit({
    req,
    user: req.user,
    action: 'product.quick_purchase',
    resourceType: 'product',
    resourceId: updatedProduct._id,
    details: {
      quantity,
      talla: normalizedTalla || 'UNITALLA',
      remainingStock: updatedProduct.stock
    }
  });

  return res.status(200).json({
    message: 'Compra simulada exitosa',
    purchase: {
      productId: updatedProduct._id,
      buyerId: req.user.id,
      quantity,
      talla: normalizedTalla || 'UNITALLA',
      total: Number((updatedProduct.precio * quantity).toFixed(2)),
      simulatedAt: new Date().toISOString()
    },
    remainingStock: updatedProduct.stock
  });
};
