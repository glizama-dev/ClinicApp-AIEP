'use strict';

const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const {
  loginLimiter,
  loginPorCuentaLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../middleware/rateLimit');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerLimiter, asyncHandler(ctrl.register));
router.post('/login', loginLimiter, loginPorCuentaLimiter, asyncHandler(ctrl.login));
router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', resetPasswordLimiter, asyncHandler(ctrl.resetPassword));
router.get('/me', requireAuth, asyncHandler(ctrl.me));

module.exports = router;
