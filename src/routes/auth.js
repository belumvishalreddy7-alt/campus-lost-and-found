'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authLimiter, asyncHandler(authController.signup));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/logout', authenticate, asyncHandler(authController.logout));

module.exports = router;
