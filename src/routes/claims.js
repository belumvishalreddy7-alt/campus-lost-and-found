'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const claimController = require('../controllers/claimController');

const router = express.Router();

router.use(authenticate);

router.post('/', asyncHandler(claimController.create));
router.get('/mine', asyncHandler(claimController.listMine));
router.get('/:id', asyncHandler(claimController.getOne));
router.patch('/:id', asyncHandler(claimController.decide));
router.put('/:id', asyncHandler(claimController.decide));

module.exports = router;
