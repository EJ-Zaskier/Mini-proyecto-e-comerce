const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/productController');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  createProductValidation,
  updateProductValidation,
  productIdValidation,
  listProductsValidation,
  purchaseProductValidation
} = require('../validators/product.validator');


router.get('/', listProductsValidation, validate, asyncHandler(ctrl.list));
router.post('/:id/purchase', auth, purchaseProductValidation, validate, asyncHandler(ctrl.purchase));
router.get('/:id', productIdValidation, validate, asyncHandler(ctrl.getById));
router.post('/', auth, role('admin'), createProductValidation, validate, asyncHandler(ctrl.create));
router.put('/:id', auth, role('admin'), updateProductValidation, validate, asyncHandler(ctrl.update));
router.delete('/:id', auth, role('admin'), productIdValidation, validate, asyncHandler(ctrl.remove));


module.exports = router;
