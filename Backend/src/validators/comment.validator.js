const { body } = require('express-validator');

exports.createCommentValidation = [
  body('contenido')
    .trim()
    .isLength({ min: 1, max: 280 })
    .withMessage('El comentario debe tener entre 1 y 280 caracteres')
];
