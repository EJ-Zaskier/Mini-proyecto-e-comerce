const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/adminController');
const {
  updateUserRoleValidation,
  listAdminLogsValidation,
  deleteUserValidation,
  seedProductsValidation,
  createUserByAdminValidation
} = require('../validators/admin.validator');

router.use(auth, role('admin'));

router.get('/overview', asyncHandler(ctrl.getOverview));
router.get('/users', listAdminLogsValidation, validate, asyncHandler(ctrl.listUsers));
router.post('/users', createUserByAdminValidation, validate, asyncHandler(ctrl.createUser));
router.patch('/users/:id/role', updateUserRoleValidation, validate, asyncHandler(ctrl.updateUserRole));
router.delete('/users/:id', deleteUserValidation, validate, asyncHandler(ctrl.deleteUser));
router.post('/seed-products', seedProductsValidation, validate, asyncHandler(ctrl.seedDemoProducts));
router.get('/sessions', listAdminLogsValidation, validate, asyncHandler(ctrl.listLoginSessions));
router.get('/audit-logs', listAdminLogsValidation, validate, asyncHandler(ctrl.listAuditLogs));

module.exports = router;
