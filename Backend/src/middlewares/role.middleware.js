module.exports = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: 'No tienes permisos para esta accion' });
  }

  return next();
};
