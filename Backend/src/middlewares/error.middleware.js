const mongoose = require('mongoose');

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Sesion expirada, inicia sesion de nuevo' });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Identificador invalido' });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: 'Datos invalidos',
      errors: Object.values(err.errors).map(({ path, message }) => ({ field: path, message }))
    });
  }

  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ message: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Registro duplicado' });
  }

  const status = err.statusCode || 500;
  const message = status >= 500 ? 'Error interno del servidor' : err.message || 'Error en la solicitud';

  if (status >= 500) {
    console.error(err);
  }

  return res.status(status).json({ message });
};
