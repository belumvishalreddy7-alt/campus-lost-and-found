'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { singleImage } = require('../middleware/upload');
const itemController = require('../controllers/itemController');

const router = express.Router();

router.get('/', optionalAuth, asyncHandler(itemController.list));
router.get('/:id/claims', authenticate, asyncHandler(itemController.listClaims));
router.get('/:id', asyncHandler(itemController.getOne));
router.post('/', authenticate, singleImage, asyncHandler(itemController.create));
router.put('/:id', authenticate, singleImage, asyncHandler(itemController.update));
router.patch('/:id', authenticate, singleImage, asyncHandler(itemController.update));
router.delete('/:id', authenticate, asyncHandler(itemController.remove));

module.exports = router;
