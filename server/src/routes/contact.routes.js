'use strict';

const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { contactLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/contact.controller');

const router = express.Router();

router.post('/', contactLimiter, asyncHandler(ctrl.enviar));

module.exports = router;
