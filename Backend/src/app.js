const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const commentRoutes = require('./routes/comment.routes');
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
const trustProxyRaw = (process.env.TRUST_PROXY || '').trim().toLowerCase();
const trustProxy = trustProxyRaw === '1' || trustProxyRaw === 'true' || trustProxyRaw === 'loopback'
  ? (trustProxyRaw === 'loopback' ? 'loopback' : 1)
  : false;
app.set('trust proxy', trustProxy);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use(errorMiddleware);

module.exports = app;
