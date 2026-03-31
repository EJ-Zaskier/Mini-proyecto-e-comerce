const { matchedData } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { logAudit } = require('../utils/auditLogger');

const normalizeTalla = (value = '') => String(value).trim().toUpperCase();

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate('items.product');
  }
  return cart;
};

const getSizeInfo = (product, talla) => {
  if (!Array.isArray(product.tallas) || product.tallas.length === 0) {
    return {
      resolvedTalla: normalizeTalla(talla || 'UNITALLA') || 'UNITALLA',
      stockDisponible: product.stock,
      usesSizeStock: false
    };
  }

  const normalized = normalizeTalla(talla || '');
  if (!normalized) {
    return {
      error: 'Debes seleccionar una talla para este producto'
    };
  }

  const sizeRow = product.tallas.find((size) => size.talla === normalized);
  if (!sizeRow) {
    return {
      error: 'La talla seleccionada no existe para este producto'
    };
  }

  return {
    resolvedTalla: normalized,
    stockDisponible: sizeRow.stock,
    usesSizeStock: true
  };
};

const getStockAvailableForItem = (product, talla) => {
  if (!Array.isArray(product.tallas) || product.tallas.length === 0) {
    return product.stock;
  }

  const normalized = normalizeTalla(talla);
  const sizeRow = product.tallas.find((size) => size.talla === normalized);
  return sizeRow ? sizeRow.stock : 0;
};

const serializeCart = (cart) => {
  const items = cart.items
    .filter((item) => item.product)
    .map((item) => ({
      itemId: item._id,
      productId: item.product._id,
      nombre: item.product.nombre,
      precio: item.product.precio,
      talla: item.talla || 'UNITALLA',
      stockDisponible: getStockAvailableForItem(item.product, item.talla),
      imagenUrl: item.product.imagenUrl,
      quantity: item.quantity,
      subtotal: Number((item.product.precio * item.quantity).toFixed(2))
    }));

  const total = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));

  return {
    items,
    total,
    totalItems: items.reduce((acc, item) => acc + item.quantity, 0)
  };
};

exports.getCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  return res.status(200).json({ cart: serializeCart(cart) });
};

exports.addItem = async (req, res) => {
  const body = matchedData(req, { locations: ['body'] });
  const { productId, quantity } = body;
  const tallaInput = body.talla;

  const product = await Product.findOne({ _id: productId, activo: true });
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  const sizeInfo = getSizeInfo(product, tallaInput);
  if (sizeInfo.error) {
    return res.status(400).json({ message: sizeInfo.error });
  }

  const { resolvedTalla, stockDisponible } = sizeInfo;
  const cart = await getOrCreateCart(req.user.id);
  const existingItem = cart.items.find((item) => (
    item.product
    && item.product._id.toString() === productId
    && normalizeTalla(item.talla) === resolvedTalla
  ));

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > stockDisponible) {
      return res.status(409).json({ message: 'No hay stock suficiente para agregar esa cantidad' });
    }
    existingItem.quantity = newQuantity;
  } else {
    if (quantity > stockDisponible) {
      return res.status(409).json({ message: 'No hay stock suficiente para agregar esa cantidad' });
    }
    cart.items.push({ product: productId, talla: resolvedTalla, quantity });
  }

  await cart.save();
  const updatedCart = await Cart.findById(cart._id).populate('items.product');

  await logAudit({
    req,
    user: req.user,
    action: 'cart.item_added',
    resourceType: 'cart',
    resourceId: cart._id,
    details: {
      productId,
      talla: resolvedTalla,
      quantity
    }
  });

  return res.status(200).json({
    message: 'Producto agregado al carrito',
    cart: serializeCart(updatedCart)
  });
};

exports.updateItemQuantity = async (req, res) => {
  const body = matchedData(req, { locations: ['body'] });
  const { itemId } = req.params;
  const { quantity } = body;

  const cart = await getOrCreateCart(req.user.id);
  const item = cart.items.id(itemId);

  if (!item) {
    return res.status(404).json({ message: 'Item no encontrado en carrito' });
  }

  const product = await Product.findOne({ _id: item.product, activo: true });
  if (!product) {
    return res.status(404).json({ message: 'Producto no disponible' });
  }

  const availableStock = getStockAvailableForItem(product, item.talla);
  if (quantity > availableStock) {
    return res.status(409).json({ message: 'No hay stock suficiente para esa cantidad' });
  }

  item.quantity = quantity;
  await cart.save();
  const updatedCart = await Cart.findById(cart._id).populate('items.product');

  await logAudit({
    req,
    user: req.user,
    action: 'cart.item_quantity_updated',
    resourceType: 'cart',
    resourceId: cart._id,
    details: {
      itemId,
      talla: item.talla,
      quantity
    }
  });

  return res.status(200).json({
    message: 'Cantidad actualizada',
    cart: serializeCart(updatedCart)
  });
};

exports.removeItem = async (req, res) => {
  const { itemId } = req.params;
  const cart = await getOrCreateCart(req.user.id);

  const item = cart.items.id(itemId);
  if (!item) {
    return res.status(404).json({ message: 'Item no encontrado en carrito' });
  }

  item.deleteOne();
  await cart.save();
  const updatedCart = await Cart.findById(cart._id).populate('items.product');

  await logAudit({
    req,
    user: req.user,
    action: 'cart.item_removed',
    resourceType: 'cart',
    resourceId: cart._id,
    details: { itemId }
  });

  return res.status(200).json({
    message: 'Producto eliminado del carrito',
    cart: serializeCart(updatedCart)
  });
};

exports.checkout = async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  if (!cart.items.length) {
    return res.status(400).json({ message: 'El carrito esta vacio' });
  }

  await cart.populate('items.product');

  const decremented = [];
  const purchasedItems = [];

  for (const item of cart.items) {
    if (!item.product || !item.product.activo) {
      for (const rollback of decremented) {
        if (rollback.talla) {
          await Product.updateOne(
            { _id: rollback.productId, 'tallas.talla': rollback.talla },
            {
              $inc: {
                'tallas.$.stock': rollback.quantity,
                stock: rollback.quantity
              }
            }
          );
        } else {
          await Product.updateOne({ _id: rollback.productId }, { $inc: { stock: rollback.quantity } });
        }
      }
      return res.status(409).json({ message: 'Uno de los productos ya no esta disponible' });
    }

    let updatedProduct;
    if (Array.isArray(item.product.tallas) && item.product.tallas.length > 0) {
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product._id,
          activo: true,
          tallas: {
            $elemMatch: {
              talla: normalizeTalla(item.talla),
              stock: { $gte: item.quantity }
            }
          }
        },
        {
          $inc: {
            'tallas.$.stock': -item.quantity,
            stock: -item.quantity
          }
        },
        { new: true }
      );
    } else {
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product._id,
          activo: true,
          stock: { $gte: item.quantity }
        },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
    }

    if (!updatedProduct) {
      for (const rollback of decremented) {
        if (rollback.talla) {
          await Product.updateOne(
            { _id: rollback.productId, 'tallas.talla': rollback.talla },
            {
              $inc: {
                'tallas.$.stock': rollback.quantity,
                stock: rollback.quantity
              }
            }
          );
        } else {
          await Product.updateOne({ _id: rollback.productId }, { $inc: { stock: rollback.quantity } });
        }
      }
      return res.status(409).json({
        message: `No hay stock suficiente para "${item.product.nombre}" en talla ${item.talla || 'UNITALLA'}`
      });
    }

    decremented.push({
      productId: updatedProduct._id,
      talla: Array.isArray(item.product.tallas) && item.product.tallas.length > 0
        ? normalizeTalla(item.talla)
        : '',
      quantity: item.quantity
    });

    purchasedItems.push({
      productId: item.product._id,
      nombre: item.product.nombre,
      talla: item.talla || 'UNITALLA',
      quantity: item.quantity,
      precioUnitario: item.product.precio,
      subtotal: Number((item.quantity * item.product.precio).toFixed(2)),
      stockRestante: updatedProduct.stock
    });
  }

  cart.items = [];
  await cart.save();

  const total = Number(purchasedItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));

  await logAudit({
    req,
    user: req.user,
    action: 'cart.checkout_completed',
    resourceType: 'cart',
    resourceId: cart._id,
    details: {
      total,
      items: purchasedItems.map((item) => ({
        productId: item.productId,
        talla: item.talla,
        quantity: item.quantity
      }))
    }
  });

  return res.status(200).json({
    message: 'Compra simulada realizada correctamente',
    checkout: {
      items: purchasedItems,
      total
    }
  });
};
