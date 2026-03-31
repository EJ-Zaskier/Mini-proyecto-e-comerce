const { body, param, query } = require('express-validator');
const { PRODUCT_TYPES, PRODUCT_CATEGORIES, PRODUCT_SEGMENTS } = require('../constants/product');

const sizeStockValidation = body('tallas')
  .optional()
  .custom((sizes) => {
    if (!Array.isArray(sizes)) {
      throw new Error('Las tallas deben enviarse como arreglo');
    }

    if (sizes.length > 25) {
      throw new Error('No puedes enviar mas de 25 tallas por producto');
    }

    for (const size of sizes) {
      const label = String(size?.talla || '').trim();
      const parsedStock = Number.parseInt(size?.stock, 10);
      if (!label || label.length > 12) {
        throw new Error('Cada talla debe tener entre 1 y 12 caracteres');
      }
      if (Number.isNaN(parsedStock) || parsedStock < 0 || parsedStock > 100000) {
        throw new Error('El stock por talla debe ser un entero entre 0 y 100000');
      }
    }

    return true;
  });

const getProductBodyRules = ({ optional }) => {
  const withOptional = (chain) => {
    if (optional) {
      return chain.optional();
    }

    return chain;
  };

  return [
    withOptional(body('nombre'))
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('El nombre debe tener entre 2 y 120 caracteres'),
    withOptional(body('descripcion'))
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('La descripcion debe tener entre 10 y 500 caracteres'),
    withOptional(body('precio'))
      .isFloat({ min: 0, max: 1000000 })
      .withMessage('El precio debe ser mayor o igual a 0'),
    body('stock')
      .optional()
      .isInt({ min: 0, max: 100000 })
      .withMessage('El stock debe ser mayor o igual a 0'),
    body('tipo')
      .optional()
      .isIn(PRODUCT_TYPES)
      .withMessage(`El tipo debe ser uno de: ${PRODUCT_TYPES.join(', ')}`),
    withOptional(body('categoria'))
      .isIn(PRODUCT_CATEGORIES)
      .withMessage(`La categoria debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}`),
    body('segmento')
      .optional()
      .isIn(PRODUCT_SEGMENTS)
      .withMessage(`El segmento debe ser uno de: ${PRODUCT_SEGMENTS.join(', ')}`),
    sizeStockValidation,
    body('imagenUrl')
      .optional({ values: 'falsy' })
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('La URL de imagen debe ser valida')
  ];
};

exports.createProductValidation = getProductBodyRules({ optional: false });

exports.updateProductValidation = [
  param('id').isMongoId().withMessage('ID de producto invalido'),
  ...getProductBodyRules({ optional: true })
];

exports.productIdValidation = [
  param('id').isMongoId().withMessage('ID de producto invalido')
];

exports.purchaseProductValidation = [
  param('id').isMongoId().withMessage('ID de producto invalido'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('La cantidad debe ser un entero entre 1 y 100'),
  body('talla')
    .optional()
    .trim()
    .isLength({ min: 1, max: 12 })
    .withMessage('La talla debe tener entre 1 y 12 caracteres')
];

exports.listProductsValidation = [
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page invalido'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit invalido'),
  query('q').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Busqueda invalida'),
  query('categoria')
    .optional()
    .isIn(PRODUCT_CATEGORIES)
    .withMessage(`La categoria debe ser una de: ${PRODUCT_CATEGORIES.join(', ')}`),
  query('segmento')
    .optional()
    .isIn(PRODUCT_SEGMENTS)
    .withMessage(`El segmento debe ser uno de: ${PRODUCT_SEGMENTS.join(', ')}`),
  query('tipo')
    .optional()
    .isIn(PRODUCT_TYPES)
    .withMessage(`El tipo debe ser uno de: ${PRODUCT_TYPES.join(', ')}`),
  query('minPrecio').optional().isFloat({ min: 0 }).withMessage('minPrecio invalido'),
  query('maxPrecio').optional().isFloat({ min: 0 }).withMessage('maxPrecio invalido'),
  query('maxPrecio').custom((maxPrecio, { req }) => {
    const { minPrecio } = req.query;
    if (minPrecio && Number(maxPrecio) < Number(minPrecio)) {
      throw new Error('maxPrecio debe ser mayor o igual a minPrecio');
    }

    return true;
  })
];
