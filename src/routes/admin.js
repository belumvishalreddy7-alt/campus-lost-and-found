'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const claimController = require('../controllers/claimController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', asyncHandler(adminController.stats));
router.get('/items', asyncHandler(adminController.listItems));
router.get('/items/:id/claims', asyncHandler(adminController.itemClaims));
router.get('/claims', asyncHandler(claimController.listAll));
router.get('/users', asyncHandler(adminController.listUsers));

module.exports = router;
