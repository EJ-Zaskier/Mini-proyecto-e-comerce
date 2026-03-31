const { body } = require('express-validator');

const emailValidation = body('email')
  .trim()
  .isEmail()
  .withMessage('Email invalido')
  .normalizeEmail();

exports.registerValidation = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre debe tener entre 2 y 80 caracteres'),
  emailValidation,
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('La contraseña debe tener entre 8 y 64 caracteres')
];

exports.loginValidation = [
  emailValidation,
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('La contraseña es invalida')
];
