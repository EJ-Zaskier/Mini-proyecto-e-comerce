const User = require('../models/User');
const LoginSession = require('../models/LoginSession');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { matchedData } = require('express-validator');
const { getClientIp, getUserAgent } = require('../utils/requestInfo');
const { logAudit } = require('../utils/auditLogger');

const tokenExpiresIn = process.env.JWT_EXPIRES_IN || '2h';

const serializeUser = (user) => ({
  id: user._id,
  nombre: user.nombre,
  email: user.email,
  role: user.role
});

const createToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: tokenExpiresIn }
);

exports.register = async (req, res) => {
  const { nombre, email, password } = matchedData(req, {
    locations: ['body'],
    includeOptionals: false
  });

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'El correo ya esta registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    nombre,
    email,
    passwordHash
  });
  const token = createToken(user);

  await logAudit({
    req,
    user,
    action: 'auth.register',
    resourceType: 'user',
    resourceId: user._id,
    details: { email: user.email, role: user.role }
  });

  return res.status(201).json({
    message: 'Cuenta creada correctamente',
    user: serializeUser(user),
    token
  });
};


exports.login = async (req, res) => {
  const { email, password } = matchedData(req, {
    locations: ['body'],
    includeOptionals: false
  });
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await logAudit({
      req,
      action: 'auth.login_failed',
      resourceType: 'session',
      details: {
        email,
        reason: 'user_not_found'
      }
    });
    return res.status(401).json({ message: 'Credenciales invalidas' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    await logAudit({
      req,
      user,
      action: 'auth.login_failed',
      resourceType: 'session',
      details: {
        email: user.email,
        reason: 'invalid_password'
      }
    });
    return res.status(401).json({ message: 'Credenciales invalidas' });
  }

  const token = createToken(user);

  await LoginSession.create({
    user: user._id,
    email: user.email,
    ip: getClientIp(req),
    userAgent: getUserAgent(req)
  });

  await logAudit({
    req,
    user,
    action: 'auth.login',
    resourceType: 'session',
    details: { email: user.email, role: user.role }
  });

  return res.status(200).json({
    message: 'Sesion iniciada',
    user: serializeUser(user),
    token
  });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  return res.status(200).json({ user: serializeUser(user) });
};
