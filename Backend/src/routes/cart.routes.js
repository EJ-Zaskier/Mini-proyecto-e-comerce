const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/cartController');
const {
  addToCartValidation,
  updateCartItemValidation,
  cartItemIdValidation
} = require('../validators/cart.validator');

router.use(auth);

router.get('/', asyncHandler(ctrl.getCart));
router.post('/items', addToCartValidation, validate, asyncHandler(ctrl.addItem));
router.put('/items/:itemId', updateCartItemValidation, validate, asyncHandler(ctrl.updateItemQuantity));
router.delete('/items/:itemId', cartItemIdValidation, validate, asyncHandler(ctrl.removeItem));
router.post('/checkout', asyncHandler(ctrl.checkout));

module.exports = router;
