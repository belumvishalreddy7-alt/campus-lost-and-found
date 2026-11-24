'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.join(__dirname, '..', '..', config.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40);
    cb(null, `${Date.now()}-${base || 'item'}${ext}`);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPEG, PNG, WEBP or GIF images may be uploaded'));
    }
    return cb(null, true);
  },
});

/** Accept a single optional image under the field name "image". */
const singleImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('Image must be 2 MB or smaller'));
    }
    return next(err);
  });
};

module.exports = { singleImage, uploadRoot };
