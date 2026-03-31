const { body, param } = require('express-validator');

exports.addToCartValidation = [
  body('productId').isMongoId().withMessage('ID de producto invalido'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('La cantidad debe ser un entero entre 1 y 100'),
  body('talla')
    .optional()
    .trim()
    .isLength({ min: 1, max: 12 })
    .withMessage('La talla debe tener entre 1 y 12 caracteres')
];

exports.updateCartItemValidation = [
  param('itemId').isMongoId().withMessage('ID de item invalido'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('La cantidad debe ser un entero entre 1 y 100')
];

exports.cartItemIdValidation = [
  param('itemId').isMongoId().withMessage('ID de item invalido')
];
