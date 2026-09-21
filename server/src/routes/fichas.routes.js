'use strict';

const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/fichas.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', asyncHandler(ctrl.crear));
router.get('/', asyncHandler(ctrl.listar));
router.get('/:id', asyncHandler(ctrl.detalle));
router.put('/:id', asyncHandler(ctrl.actualizar));

module.exports = router;
