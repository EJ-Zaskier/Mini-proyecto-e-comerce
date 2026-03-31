const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/commentController');
const validate = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { createCommentValidation } = require('../validators/comment.validator');


router.post('/', auth, createCommentValidation, validate, asyncHandler(ctrl.create));
router.get('/', auth, asyncHandler(ctrl.list));


module.exports = router;
