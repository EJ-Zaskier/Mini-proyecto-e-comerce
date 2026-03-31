const { matchedData } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const LoginSession = require('../models/LoginSession');
const AuditLog = require('../models/AuditLog');
const Cart = require('../models/Cart');
const Comment = require('../models/Comment');
const { logAudit } = require('../utils/auditLogger');

const SEGMENTS = ['hombre', 'mujer', 'nino', 'nina', 'bebe'];
const CATEGORIES = ['ropa', 'calzado', 'accesorios'];
const PRODUCT_NAMES = {
  hombre: {
    ropa: ['Camisa Urban Fit', 'Playera Oversize Noir', 'Jeans Corte Recto'],
    calzado: ['Sneaker Metro', 'Bota Trail Brown', 'Tenis Runner Volt'],
    accesorios: ['Cinturon Premium', 'Mochila Compact', 'Gorra Shadow']
  },
  mujer: {
    ropa: ['Blusa Satin Flow', 'Vestido Aura', 'Pantalon High Rise'],
    calzado: ['Sneaker Luna', 'Botin Firenze', 'Sandalia Nova'],
    accesorios: ['Bolso Stella', 'Lentes Skyline', 'Bufanda Soft Knit']
  },
  nino: {
    ropa: ['Playera Kids Team', 'Pantalon Cargo Junior', 'Sudadera Play'],
    calzado: ['Tenis Mini Sprint', 'Bota Aventura Kid', 'Sneaker School'],
    accesorios: ['Mochila Dino', 'Gorra Energy', 'Calceta Sport Pack']
  },
  nina: {
    ropa: ['Vestido Bloom', 'Playera Star Kid', 'Leggings Active'],
    calzado: ['Tenis Sparkle', 'Balerina Soft', 'Bota Mini Chic'],
    accesorios: ['Mochila Aurora', 'Diadema Shine', 'Bolsa Mini Pop']
  },
  bebe: {
    ropa: ['Set Algodon Baby', 'Mameluco Nube', 'Conjunto Suave'],
    calzado: ['Zapato Primeros Pasos', 'Tenis Baby Soft', 'Sandalia Bebito'],
    accesorios: ['Babero Doble', 'Gorro Plush', 'Panuelo Baby Care']
  }
};

const SIZE_TEMPLATE = {
  hombre: ['S', 'M', 'L', 'XL'],
  mujer: ['XS', 'S', 'M', 'L'],
  nino: ['4', '6', '8', '10', '12'],
  nina: ['4', '6', '8', '10', '12'],
  bebe: ['0-3M', '3-6M', '6-12M', '12-18M']
};

const getPagination = (query) => {
  const page = Number.parseInt(query.page || 1, 10);
  const limit = Number.parseInt(query.limit || 20, 10);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const parseExpiresToMs = (raw) => {
  if (!raw) return 2 * 60 * 60 * 1000;

  const normalized = String(raw).trim().toLowerCase();
  const asNumber = Number.parseInt(normalized, 10);

  if (/^\d+$/.test(normalized) && !Number.isNaN(asNumber)) {
    // jwt accepts seconds when numeric.
    return asNumber * 1000;
  }

  const match = normalized.match(/^(\d+)([smhd])$/);
  if (!match) return 2 * 60 * 60 * 1000;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return value * unitMap[unit];
};

const tokenTtlMs = parseExpiresToMs(process.env.JWT_EXPIRES_IN || '2h');

const buildSeedItems = (createdBy, count) => {
  const generated = [];
  let sequence = 1;

  for (const segment of SEGMENTS) {
    for (const category of CATEGORIES) {
      const baseNames = PRODUCT_NAMES[segment][category];
      const loopCount = Math.max(1, Math.floor(count / (SEGMENTS.length * CATEGORIES.length)));

      for (let i = 0; i < loopCount; i += 1) {
        const name = baseNames[i % baseNames.length];
        const tallas = SIZE_TEMPLATE[segment].map((talla) => ({
          talla,
          stock: randomBetween(2, 16)
        }));

        generated.push({
          nombre: `${name} ${sequence}`,
          descripcion: `Producto ${category} para ${segment}. Diseno comodo, moderno y resistente para uso diario.`,
          precio: randomBetween(199, 1899),
          tipo: 'producto',
          categoria: category,
          segmento: segment,
          tallas,
          imagenUrl: `https://loremflickr.com/900/720/fashion,clothing,${segment},${category}?lock=${sequence}`,
          creadoPor: createdBy,
          activo: true
        });
        sequence += 1;
      }
    }
  }

  return generated.slice(0, Math.max(1, count));
};

exports.listUsers = async (req, res) => {
  const query = matchedData(req, { locations: ['query'] });
  const { page, limit, skip } = getPagination(query);

  const [users, total] = await Promise.all([
    User.find().select('nombre email role createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments()
  ]);

  return res.status(200).json({
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
};

exports.createUser = async (req, res) => {
  const body = matchedData(req, { locations: ['body'] });

  const existingUser = await User.findOne({ email: body.email });
  if (existingUser) {
    return res.status(409).json({ message: 'El correo ya esta registrado' });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await User.create({
    nombre: body.nombre,
    email: body.email,
    passwordHash,
    role: body.role || 'user'
  });

  await logAudit({
    req,
    user: req.user,
    action: 'admin.user.created',
    resourceType: 'user',
    resourceId: user._id,
    details: {
      targetEmail: user.email,
      assignedRole: user.role
    }
  });

  return res.status(201).json({
    message: 'Usuario creado correctamente',
    user: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    }
  });
};

exports.updateUserRole = async (req, res) => {
  const body = matchedData(req, { locations: ['body'] });
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ message: 'No puedes modificar tu propio rol desde este endpoint' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  if (user.role === 'admin' && body.role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Debe existir al menos un usuario con rol admin' });
    }
  }

  user.role = body.role;
  await user.save();

  await logAudit({
    req,
    user: req.user,
    action: 'admin.user.role_updated',
    resourceType: 'user',
    resourceId: user._id,
    details: {
      targetEmail: user.email,
      assignedRole: user.role
    }
  });

  return res.status(200).json({
    message: 'Rol actualizado correctamente',
    user: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    }
  });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta desde este endpoint' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Debe existir al menos un admin activo en el sistema' });
    }
  }

  const [removedCart, removedSessions, removedAuditLogs, removedComments, disabledProducts] = await Promise.all([
    Cart.deleteOne({ user: id }),
    LoginSession.deleteMany({ user: id }),
    AuditLog.deleteMany({ user: id }),
    Comment.deleteMany({ usuario: id }),
    Product.updateMany({ creadoPor: id }, { $set: { activo: false } })
  ]);

  await User.deleteOne({ _id: id });

  await logAudit({
    req,
    user: req.user,
    action: 'admin.user.deleted',
    resourceType: 'user',
    resourceId: id,
    details: {
      email: user.email,
      role: user.role,
      removedSessions: removedSessions.deletedCount || 0,
      removedAuditLogs: removedAuditLogs.deletedCount || 0,
      removedComments: removedComments.deletedCount || 0,
      disabledProducts: disabledProducts.modifiedCount || 0,
      removedCart: removedCart.deletedCount || 0
    }
  });

  return res.status(200).json({
    message: 'Cuenta eliminada junto con su historial principal',
    deleted: {
      userId: id,
      sessions: removedSessions.deletedCount || 0,
      auditLogs: removedAuditLogs.deletedCount || 0,
      comments: removedComments.deletedCount || 0,
      disabledProducts: disabledProducts.modifiedCount || 0
    }
  });
};

exports.seedDemoProducts = async (req, res) => {
  const body = matchedData(req, { locations: ['body'] });
  const count = Number.parseInt(body.count || 30, 10);
  const sanitizedCount = Number.isNaN(count) ? 30 : Math.min(Math.max(count, 10), 120);

  const products = buildSeedItems(req.user.id, sanitizedCount);
  const inserted = await Product.insertMany(products);

  await logAudit({
    req,
    user: req.user,
    action: 'admin.products.seeded',
    resourceType: 'product',
    details: {
      inserted: inserted.length
    }
  });

  return res.status(201).json({
    message: 'Productos demo creados correctamente',
    inserted: inserted.length
  });
};

exports.listLoginSessions = async (req, res) => {
  const query = matchedData(req, { locations: ['query'] });
  const { page, limit, skip } = getPagination(query);

  const [sessions, total] = await Promise.all([
    LoginSession.find()
      .populate('user', 'nombre email role')
      .sort({ loggedAt: -1 })
      .skip(skip)
      .limit(limit),
    LoginSession.countDocuments()
  ]);

  const now = Date.now();
  const mappedSessions = sessions.map((session) => {
    const loggedAtMs = new Date(session.loggedAt).getTime();
    return {
      ...session.toObject(),
      isActive: now - loggedAtMs <= tokenTtlMs
    };
  });

  return res.status(200).json({
    sessions: mappedSessions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
};

exports.listAuditLogs = async (req, res) => {
  const query = matchedData(req, { locations: ['query'] });
  const { page, limit, skip } = getPagination(query);

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .populate('user', 'nombre email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments()
  ]);

  return res.status(200).json({
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
};

exports.getOverview = async (req, res) => {
  const [totalUsers, totalAdmins, totalSessions, totalLogs, totalProducts] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    LoginSession.countDocuments(),
    AuditLog.countDocuments(),
    Product.countDocuments({ activo: true })
  ]);

  return res.status(200).json({
    overview: {
      totalUsers,
      totalAdmins,
      totalSessions,
      totalLogs,
      totalProducts
    }
  });
};
