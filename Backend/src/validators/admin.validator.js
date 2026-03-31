const { param, body, query } = require('express-validator');

exports.userIdValidation = [
  param('id').isMongoId().withMessage('ID de usuario invalido')
];

exports.updateUserRoleValidation = [
  ...exports.userIdValidation,
  body('role')
    .isIn(['admin', 'user'])
    .withMessage('El rol debe ser admin o user')
];

exports.listAdminLogsValidation = [
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page invalido'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit invalido')
];

exports.deleteUserValidation = [
  ...exports.userIdValidation
];

exports.seedProductsValidation = [
  body('count').optional().isInt({ min: 10, max: 120 }).withMessage('Count invalido')
];

exports.createUserByAdminValidation = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre debe tener entre 2 y 80 caracteres'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email invalido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('La contraseña debe tener entre 8 y 64 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('El rol debe ser admin o user')
];
