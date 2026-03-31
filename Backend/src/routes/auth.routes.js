const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { registerValidation, loginValidation } = require('../validators/auth.validator');

const authRateLimitMax = Number.parseInt(
  process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'test' ? '1000' : '20'),
  10
);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number.isNaN(authRateLimitMax) ? 20 : authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, intenta mas tarde' }
});

router.post('/register', authLimiter, registerValidation, validate, asyncHandler(ctrl.register));
router.post('/login', authLimiter, loginValidation, validate, asyncHandler(ctrl.login));
router.get('/me', auth, asyncHandler(ctrl.me));


module.exports = router;
