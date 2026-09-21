'use strict';

const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, resendLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, asyncHandler(ctrl.register));
router.post('/verify', authLimiter, asyncHandler(ctrl.verify));
router.post('/resend', resendLimiter, asyncHandler(ctrl.resend));
router.post('/login', authLimiter, asyncHandler(ctrl.login));
router.get('/me', requireAuth, asyncHandler(ctrl.me));

module.exports = router;
