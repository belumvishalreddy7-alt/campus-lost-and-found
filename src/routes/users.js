'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const itemController = require('../controllers/itemController');
const claimController = require('../controllers/claimController');

const router = express.Router();

router.use(authenticate);

// User dashboard feeds
router.get('/me/items', asyncHandler(itemController.listMine));
router.get('/me/claims', asyncHandler(claimController.listMine));
router.get('/:id/items', asyncHandler(itemController.listMine));

module.exports = router;
